const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseNodes, mergeWebsiteVhost } = require('./ops-merge-nginx.cjs');
const { spawnSync } = require('node:child_process');

const reference = fs.readFileSync(path.join(__dirname, 'nginx.conf'), 'utf8');
const apps = ['/ai-avatar', '/api/liveavatar/', '^~ /dj', '/polymarket', '/crypto', '/nuanu-media', '^~ /vdj', '/extra', '/other'];
const includes = ['muvs-dubplates', 'muvs-life-route', 'muvs-realtime-route', 'muvs-production-route', 'natural-shaper-route', 'muvs-content-route'];
const source = `# exact live fixture\nserver {
    server_name muvs.dev www.muvs.dev;
${includes.map(name => `    include /etc/nginx/snippets/${name}.conf;`).join('\n')}
    root /var/www/muvs-current/dist;
    index index.html;
${apps.map((url, i) => `    # Keep app${i}\n    location ${url} {\n        proxy_pass http://127.0.0.1:${4000 + i};\n        proxy_set_header X-Custom "# literal { };";\n        set $source "\${upstream}";\n    }`).join('\n')}
    location /api/ { proxy_pass http://127.0.0.1:3001; }
    location ^~ /uploads/ { root /var/www/muvs-data; try_files $uri =404; }
    location / { try_files $uri $uri/ /index.html; }
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ { expires 1y; }
    gzip on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/muvs.dev/fullchain.pem;
}
server {
    if ($host = www.muvs.dev) { return 301 https://$host$request_uri; }
    if ($host = muvs.dev) { return 301 https://$host$request_uri; }
    listen 80;
    server_name muvs.dev www.muvs.dev;
}
`;

test('guarded merge preserves every unrelated include and all nine location bodies byte-for-byte', () => {
  const merged = mergeWebsiteVhost(source, reference);
  assert.equal(merged.report.preservedLocations.length, 9);
  assert.equal(merged.report.preservedIncludes.length, 6);
  assert.equal(merged.report.replacedOwnedLocationCount, 4);
  assert.notEqual(merged.report.sourceSha256, merged.report.mergedSha256);
  const oldMain = parseNodes(source).nodes.find(node => node.header === 'server');
  for (const node of oldMain.children.filter(node => merged.report.preservedLocations.includes(node.header) || node.header.startsWith('include '))) assert.ok(merged.text.includes(node.text));
  assert.equal(parseNodes(merged.text).nodes.filter(node => node.header === 'server').length, 3);
  assert.match(merged.text, /server_name muvs\.dev;/);
  assert.match(merged.text, /server_name www\.muvs\.dev;/);
  assert.match(merged.text, /X-Muvs-Document-Uri|muvs-document-proxy\.conf/);
  assert.match(merged.text, /location = \/robots\.txt/);
  assert.match(merged.text, /location = \/sitemap\.xml/);
  assert.doesNotMatch(merged.text, /return 301 https:\/\/\$host/);
  assert.equal((merged.text.match(/listen 443 ssl;/g) || []).length, 2);
  assert.doesNotMatch(merged.text, /http2/);
  const windowsReference = reference.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  assert.equal(mergeWebsiteVhost(source, windowsReference).text, merged.text);
  assert.doesNotMatch(merged.text, /\r/);
});

test('parser handles quoted braces/comments/escapes and unquoted nginx braced variables', () => {
  const value = 'server { set $x ${target}; add_header X "a\\\" { # }"; # comment }\nlocation ~ "^/a{8,}$" { return 204; } }';
  const [server] = parseNodes(value).nodes;
  assert.equal(server.children.length, 3);
  assert.equal(server.children[0].text, 'set $x ${target};');
  assert.equal(server.children[2].header, 'location ~ "^/a{8,}$"');
  for (const invalid of ['server {', 'server { set x "unterminated;', 'server { set x ${unclosed; }', '}']) assert.throws(() => parseNodes(invalid));
});

test('unexpected/ambiguous hosts or owned blocks fail closed rather than guessing at a live config', () => {
  for (const invalid of [
    source.replace('server_name muvs.dev www.muvs.dev;', 'server_name muvs.dev another.example;'),
    source.replace('location /api/ {', 'location /different-api/ {'),
    source + '\nserver { server_name another.example; listen 443 ssl; }\n',
    source.replace('    listen 80;', '    location /foreign-http/ { return 200; }\n    listen 80;'),
  ]) assert.throws(() => mergeWebsiteVhost(invalid, reference));
  assert.throws(() => mergeWebsiteVhost(mergeWebsiteVhost(source, reference).text, reference), /two MUVS server blocks/);
});

test('rollout helper requires explicit staging and contains no live install/reload/cron writes', () => {
  const script = path.join(__dirname, 'ops-stage-rollout.cjs');
  const rejected = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.match(rejected.stderr, /Explicit root Linux --stage is required/);
  const text = fs.readFileSync(script, 'utf8');
  assert.doesNotMatch(text, /systemctl|nginx', \['-s'|crontab', \[(?!'-l')|renameSync\(|unlinkSync\(/);
  assert.match(text, /installed: false, reloaded: false/);
  assert.match(text, /--stage/);
});
