const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

function request({ hostname = '127.0.0.1', port = 3001, path: route, tls = false, timeoutMs = 1800 }) {
  return new Promise((resolve, reject) => {
    let timer, settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); if (error) reject(error); else resolve(value); };
    const transport = tls ? https : http;
    const req = transport.get({ hostname, port, path: route, servername: tls ? 'muvs.dev' : undefined,
      headers: { Host: 'muvs.dev', Accept: route.startsWith('/api/') ? 'application/json' : 'text/html' } }, res => {
      let bytes = 0, text = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 2 * 1024 * 1024) {
          const error = new Error('Health response exceeds limit'); finish(error); req.destroy(error);
        } else text += chunk;
      });
      res.on('end', () => finish(null, { status: res.statusCode, type: res.headers['content-type'] || '', text }));
      res.on('error', error => finish(error));
    });
    timer = setTimeout(() => { const error = new Error('Health request timed out'); finish(error); req.destroy(error); }, timeoutMs);
    req.on('error', error => finish(error));
  });
}

async function probe({ fetch = request, expectedAsset, origin = true } = {}) {
  const checks = [
    ['/api/data', value => Array.isArray(value.releases) && Array.isArray(value.projects)],
    ['/api/dubplates', value => Array.isArray(value.tracks)],
    ['/api/visual-effects', value => value.visualEffects && typeof value.visualEffects === 'object'],
  ];
  await Promise.all(checks.map(async ([route, valid]) => {
    const res = await fetch({ path: route });
    if (res.status !== 200 || !res.type.includes('application/json') || !valid(JSON.parse(res.text))) throw new Error(`Health failed: ${route}`);
  }));
  if (origin) {
    const res = await fetch({ path: '/', port: 443, tls: true });
    if (res.status !== 200 || !res.type.includes('text/html') || !/<html\b/i.test(res.text)
      || (expectedAsset && !res.text.includes(expectedAsset))) throw new Error('Health failed: active origin document');
  }
  return true;
}

async function waitForHealth({ deadlineMs = 18000, intervalMs = 650, now = Date.now, delay = ms => new Promise(resolve => setTimeout(resolve, ms)), ...options } = {}) {
  const deadline = now() + deadlineMs;
  let last;
  do {
    try { return await probe(options); } catch (error) { last = error; }
    if (now() >= deadline) break;
    await delay(Math.min(intervalMs, Math.max(0, deadline - now())));
  } while (now() < deadline);
  throw new Error(last?.message || 'Health deadline exceeded');
}

module.exports = { request, probe, waitForHealth };
if (require.main === module) {
  let expectedAsset;
  const release = process.argv[2];
  if (release) {
    const html = fs.readFileSync(path.join(release, 'dist', 'index.html'), 'utf8');
    expectedAsset = html.match(/(?:src|href)=["'](\/assets\/[^"']+\.js)["']/)?.[1];
    if (!expectedAsset) { console.error('Release document has no entry asset'); process.exit(1); }
  }
  waitForHealth({ expectedAsset }).then(() => console.log('MUVS API and origin document healthy'), error => { console.error(error.message); process.exitCode = 1; });
}
