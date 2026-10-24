/* global require, process, __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const proxyAddr = require('proxy-addr');

const run = promisify(execFile);

test('compressed JSON parsing survives malformed/trailing gzip and accepts a subsequent request', async () => {
  // Isolate a possible uncaught decoder error from the test runner. This binds
  // only an ephemeral loopback port and never imports the persistent site API.
  const source = String.raw`
    const assert = require('node:assert/strict');
    const http = require('node:http');
    const { once } = require('node:events');
    const { gzipSync } = require('node:zlib');
    const express = require('express');
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.post('/body', (req, res) => res.json(req.body));
    app.use((error, req, res, next) => res.status(400).json({ error: 'Invalid body' }));
    const send = (port, data) => new Promise((resolve, reject) => {
      const request = http.request({
        hostname: '127.0.0.1', port, method: 'POST', path: '/body',
        headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': data.length },
      }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { body += chunk; });
        response.on('error', reject);
        response.on('end', () => resolve({ status: response.statusCode, body }));
      });
      request.setTimeout(1500, () => request.destroy(new Error('Local request timed out')));
      request.on('error', reject);
      request.end(data);
    });
    async function main() {
      const server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      try {
        const port = server.address().port;
        const valid = gzipSync(Buffer.from(JSON.stringify({ ping: 'ok' })));
        const first = await send(port, valid);
        assert.equal(first.status, 200);
        assert.deepEqual(JSON.parse(first.body), { ping: 'ok' });
        const malformed = await send(port, Buffer.from('not a gzip stream'));
        assert.equal(malformed.status, 400);
        const trailing = await send(port, Buffer.concat([valid, Buffer.from([0, 1, 2, 3, 4])]));
        assert.ok([200, 400].includes(trailing.status));
        await new Promise(resolve => setTimeout(resolve, 30));
        const subsequent = await send(port, valid);
        assert.equal(subsequent.status, 200);
        assert.deepEqual(JSON.parse(subsequent.body), { ping: 'ok' });
        process.stdout.write(JSON.stringify({ normal: first.status, malformed: malformed.status, subsequent: subsequent.status }));
      } finally {
        await new Promise(resolve => server.close(resolve));
      }
    }
    main().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const { stdout, stderr } = await run(process.execPath, ['-e', source], {
    cwd: __dirname, timeout: 6000, maxBuffer: 64 * 1024,
  });
  assert.equal(stderr, '');
  assert.deepEqual(JSON.parse(stdout), { normal: 200, malformed: 400, subsequent: 200 });
});

test('loopback proxy trust accepts local hops but never public IPv4 or mapped IPv6 addresses', () => {
  const trust = proxyAddr.compile('loopback');
  for (const address of ['127.0.0.1', '127.1.2.3', '::1', '::ffff:127.0.0.1']) {
    assert.equal(trust(address), true, address);
  }
  for (const address of ['203.0.113.7', '::ffff:203.0.113.7', '10.0.0.1', '2001:db8::1']) {
    assert.equal(trust(address), false, address);
  }
});
