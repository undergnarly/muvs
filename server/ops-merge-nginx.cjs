const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Parse only nginx's statement/block boundaries. Quoted/escaped braces and
// ${variables} are not blocks; comments are skipped without rewriting bytes.
function parseNodes(source, from = 0, nested = false) {
  const nodes = [];
  let start = -1, quote = null;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') { i++; continue; }
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { if (start < 0) start = i; quote = ch; continue; }
    if (ch === '#') { const end = source.indexOf('\n', i); i = end < 0 ? source.length : end; continue; }
    if (start < 0 && !/\s/.test(ch)) start = i;
    if (ch === '{' && source[i - 1] === '$') {
      const end = source.indexOf('}', i); if (end < 0) throw new Error('Unclosed nginx variable'); i = end; continue;
    }
    if (ch === '{') {
      const inner = parseNodes(source, i + 1, true);
      nodes.push({ kind: 'block', start, end: inner.end, header: source.slice(start, i).trim().replace(/\s+/g, ' '), children: inner.nodes, text: source.slice(start, inner.end) });
      i = inner.end - 1; start = -1;
    } else if (ch === ';') {
      if (start < 0) throw new Error('Empty nginx directive');
      nodes.push({ kind: 'directive', start, end: i + 1, header: source.slice(start, i).trim().replace(/\s+/g, ' '), text: source.slice(start, i + 1) }); start = -1;
    } else if (ch === '}') {
      if (!nested || (start !== i && start >= 0)) throw new Error('Unexpected nginx closing brace');
      return { nodes, end: i + 1 };
    }
  }
  if (nested || quote || start >= 0) throw new Error('Incomplete nginx configuration');
  return { nodes, end: source.length };
}

const direct = (server, prefix) => server.children.filter(node => node.header.startsWith(prefix));
const names = server => direct(server, 'server_name ').flatMap(node => node.header.slice(12).split(/\s+/));
const tls = server => server.children.some(node => /^listen\s+443\b/.test(node.header));
const one = (items, message) => { if (items.length !== 1) throw new Error(message); return items[0]; };
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function mergeWebsiteVhost(original, reference) {
  // Windows checkout line endings must not leak into the Linux insertions;
  // the existing source bytes (including unrelated app blocks) stay exact.
  reference = reference.replace(/\r\n/g, '\n');
  const oldServers = parseNodes(original).nodes.filter(node => node.header === 'server');
  if (oldServers.length !== 2) throw new Error('Expected exactly the existing two MUVS server blocks');
  const oldMain = one(oldServers.filter(server => tls(server) && names(server).includes('muvs.dev')), 'MUVS TLS server is ambiguous');
  const oldHttp = one(oldServers.filter(server => !tls(server) && names(server).includes('muvs.dev')), 'MUVS HTTP server is ambiguous');
  for (const server of oldServers) if (names(server).some(name => !['muvs.dev', 'www.muvs.dev'].includes(name))) throw new Error('Foreign host in MUVS source file');
  if (direct(oldHttp, 'location ').length || direct(oldHttp, 'include ').length) throw new Error('HTTP server contains unrelated behavior; manual review required');
  for (const node of oldHttp.children.filter(node => node.kind === 'block')) {
    if (!/^if \(\$host = (?:www\.)?muvs\.dev\)$/.test(node.header)) throw new Error('Unrecognized HTTP server block');
  }
  const newServers = parseNodes(reference).nodes.filter(node => node.header === 'server');
  const newMain = one(newServers.filter(server => tls(server) && names(server).includes('muvs.dev')), 'Reference apex server is ambiguous');
  const newHttp = one(newServers.filter(server => !tls(server)), 'Reference HTTP server is ambiguous');
  const newWww = one(newServers.filter(server => tls(server) && names(server).length === 1 && names(server)[0] === 'www.muvs.dev'), 'Reference www server is ambiguous');
  const location = (server, header) => one(server.children.filter(node => node.header === header), `Expected one ${header}`);
  const oldStaticHeader = 'location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$';
  const owned = new Set(['location /api/', 'location ^~ /uploads/', 'location /', oldStaticHeader]);
  for (const header of owned) location(oldMain, header);
  const edits = [];
  const replace = (node, text) => edits.push({ start: node.start, end: node.end, text });
  replace(location(oldMain, 'location /api/'), location(newMain, 'location /api/').text);
  replace(location(oldMain, 'location ^~ /uploads/'), location(newMain, 'location ^~ /uploads/').text);
  replace(location(oldMain, 'location /'), direct(newMain, 'location ').filter(node => !['location /api/', 'location ^~ /uploads/'].includes(node.header)).map(node => node.text).join('\n\n    '));
  replace(location(oldMain, oldStaticHeader), '');
  replace(one(direct(oldMain, 'server_name '), 'Expected one apex name directive'), 'server_name muvs.dev;');
  const tokens = direct(oldMain, 'server_tokens ');
  if (tokens.length) replace(one(tokens, 'Ambiguous server_tokens'), 'server_tokens off;');
  else {
    const index = one(direct(oldMain, 'index '), 'Expected an index directive');
    replace(index, `${index.text}\n    server_tokens off;`);
  }
  const listener = one(oldMain.children.filter(node => /^listen\s+443\b/.test(node.header)), 'Expected one TLS listener');
  replace(oldHttp, newHttp.text);
  let text = original;
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
  const wwwListener = one(newWww.children.filter(node => /^listen\s+443\b/.test(node.header)), 'Reference www listener is ambiguous');
  text = `${text.trimEnd()}\n\n${newWww.text.replace(wwwListener.text, listener.text)}\n`;

  const actual = one(parseNodes(text).nodes.filter(server => server.header === 'server' && tls(server) && names(server).includes('muvs.dev')), 'Merged apex missing');
  const retainedLocations = direct(oldMain, 'location ').filter(node => !owned.has(node.header));
  const retainedIncludes = direct(oldMain, 'include ');
  for (const expected of [...retainedLocations, ...retainedIncludes]) {
    const found = one(actual.children.filter(node => node.header === expected.header), `Preserved node changed: ${expected.header}`);
    if (found.text !== expected.text) throw new Error(`Unrelated node bytes changed: ${expected.header}`);
  }
  return { text, report: { sourceSha256: digest(original), mergedSha256: digest(text),
    preservedLocations: retainedLocations.map(node => node.header), preservedIncludes: retainedIncludes.map(node => node.header),
    replacedOwnedLocationCount: owned.size, serverCount: 3 } };
}

module.exports = { parseNodes, mergeWebsiteVhost };
if (require.main === module) {
  try {
    const [source, reference, output] = process.argv.slice(2);
    const destination = path.resolve(output || '');
    const parent = fs.realpathSync(path.dirname(destination));
    if (path.basename(destination) !== 'muvs.dev.staged' || /^(?:\/etc\/nginx|\/var\/www)(?:\/|$)/.test(destination)
      || (fs.statSync(parent).mode & 0o077) !== 0) throw new Error('Output must be a new private staging file');
    const merged = mergeWebsiteVhost(fs.readFileSync(source, 'utf8'), fs.readFileSync(reference, 'utf8'));
    fs.writeFileSync(destination, merged.text, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(merged.report));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
