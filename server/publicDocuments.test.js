const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { installPublicDocuments } = require('./publicDocuments');

async function harness(t, options = {}) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'muvs-public-documents-'));
    await fs.writeFile(path.join(dir, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Muvs</title><script type="module" src="/assets/index-fake.js"></script></head><body><div id="splash-screen">LOADING</div><div id="root"></div></body></html>');
    const state = { data: { siteSettings: { siteName: 'MUVS', siteDescription: 'Music & Code' }, releases: [{ title: 'Veiled', slug: 'veiled', description: 'Four tracks.', artists: 'MUVS', coverImage: '/uploads/veiled.webp' }], projects: [], mixes: [] }, reads: 0 };
    const app = express();
    app.get('/api/ping', (_, res) => res.json({ ok: true }));
    installPublicDocuments(app, { distDir: dir, getPublicData: () => { state.reads++; return options.fail ? Promise.reject(new Error('Private failure')) : state.data; } });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        assert.ok(dir.startsWith(path.join(os.tmpdir(), 'muvs-public-documents-')));
        await fs.rm(dir, { recursive: true, force: true });
    });
    return { state, origin, get: (uri, init = {}) => fetch(`${origin}/api/public-document`, { ...init, headers: { 'X-Muvs-Document-Uri': uri, ...init.headers } }) };
}

test('one original-URI endpoint returns fresh escaped CMS metadata and fallback, while existing APIs stay untouched', async t => {
    const h = await harness(t);
    const response = await h.get('/veiled?utm_source=friend');
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
    const html = await response.text();
    assert.match(html, /<title>Veiled — MUVS<\/title>/); assert.match(html, /https:\/\/muvs.dev\/veiled/);
    assert.match(html, /<h1[^>]*>Veiled<\/h1>/); assert.match(html, /Four tracks\./); assert.match(html, /<noscript>/);
    assert.match(html, /src="\/assets\/index-fake.js"/); assert.equal((html.match(/<title>/g) || []).length, 1);
    h.state.data.releases[0].description = 'Updated live in the admin.';
    assert.match(await (await h.get('/veiled')).text(), /Updated live in the admin\./);
    h.state.data.releases.push({ title: 'New EP', slug: 'new-ep', active: true });
    assert.equal((await h.get('/new-ep')).status, 200);
    assert.deepEqual(await (await fetch(`${h.origin}/api/ping`)).json(), { ok: true });
});

test('unknown routes have true 404 HTML and private routes have raw noindex without catalog disclosure', async t => {
    const h = await harness(t);
    const missing = await h.get('/not-found-at-all');
    assert.equal(missing.status, 404); assert.match(await missing.text(), /Page not found/);
    for (const uri of ['/dubplates', '/admin', '/admin/settings', '/login', '/projects/meditation', '/test', '/music-old']) {
        const response = await h.get(uri); const html = await response.text();
        assert.equal(response.status, 200); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
        assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
        assert.ok(!html.includes('Four tracks.')); assert.ok(!html.includes('og:image'));
    }
});

test('robots and sitemap have correct formats, active URLs only, and do not advertise hidden listening routes', async t => {
    const h = await harness(t);
    const robots = await h.get('/robots.txt'); const text = await robots.text();
    assert.equal(robots.status, 200); assert.match(robots.headers.get('content-type'), /text\/plain/);
    assert.match(text, /Sitemap: https:\/\/muvs.dev\/sitemap.xml/); assert.ok(!text.includes('dubplates'));
    const sitemap = await h.get('/sitemap.xml'); const xml = await sitemap.text();
    assert.equal(sitemap.status, 200); assert.match(sitemap.headers.get('content-type'), /application\/xml/);
    assert.match(xml, /<loc>https:\/\/muvs.dev\/veiled<\/loc>/); assert.ok(!xml.includes('dubplates')); assert.ok(!xml.includes('<html'));
});

test('HEAD has the same status and headers without a response body; HTML failure does not silently serve an empty 200', async t => {
    const h = await harness(t);
    const head = await h.get('/veiled', { method: 'HEAD' });
    assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.match(head.headers.get('content-type'), /text\/html/);
    assert.equal((await h.get('/missing', { method: 'HEAD' })).status, 404);
    const failing = await harness(t, { fail: true });
    const response = await failing.get('/veiled');
    assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('Private failure'));
});

test('external, malformed, API and control-character original URI values cannot bypass the document allowlist', async t => {
    const h = await harness(t);
    for (const uri of ['https://evil.invalid/veiled', '//evil.invalid/veiled', '/api/data', '/uploads/file.wav', '/assets/main.js', '/\\evil', '/veiled#fragment']) {
        const response = await h.get(uri);
        assert.equal(response.status, 404, uri); assert.equal(await response.text(), 'Not found');
    }
    const noHeader = await fetch(`${h.origin}/api/public-document`);
    assert.equal(noHeader.status, 404); assert.equal(h.state.reads, 0);
});

test('HTML quote/script injection is escaped and fixed canonical URLs never trust request Host', async t => {
    const h = await harness(t);
    h.state.data.releases[0].title = 'Veiled & "><script>boom()</script>';
    h.state.data.releases[0].description = 'A real album </script><script>bad()</script>';
    const response = await h.get('/veiled', { headers: { Host: 'untrusted.example' } });
    const html = await response.text();
    assert.equal(response.status, 200); assert.ok(!html.includes('<script>boom()')); assert.ok(!html.includes('<script>bad()'));
    assert.match(html, /https:\/\/muvs.dev\/veiled/); assert.ok(!html.includes('untrusted.example'));
});
