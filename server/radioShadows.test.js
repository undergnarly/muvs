/* global require, process, __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

test('real Radio settings API strictly validates isolated patches, preserves other targets and persists across restart', async () => {
    const source = String.raw`
        const assert = require('node:assert/strict');
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const crypto = require('node:crypto');
        const express = require('express');
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'muvs-radio-shadow-test-'));
        process.env.DATA_DIR = folder;
        const pin = crypto.randomBytes(16).toString('hex');
        const salt = crypto.randomBytes(16).toString('hex');
        const originalEffects = { shadows: { enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 }, handheld: { strength: 2 } };
        const fixture = {
            adminSettings: { pinSalt: salt, pinHash: crypto.scryptSync(pin, salt, 64).toString('hex') },
            siteSettings: { siteName: 'Fixture', menuCaptions: { radio: 'Keep this' }, visualEffects: originalEffects, customFuture: { keep: true }, radioShadows: { y2k: { custom: true, length: 1, offsetX: 0, depthOffset: .1 } } },
            releases: [{ id: 123, title: 'Unchanged music' }], stats: { visits: 99 }, about: { text: 'Keep me' },
        };
        const file = path.join(folder, 'db.json');
        fs.writeFileSync(file, JSON.stringify(fixture));
        let server, ready;
        const originalListen = express.application.listen;
        express.application.listen = function () {
            server = originalListen.call(this, 0, '127.0.0.1');
            server.once('listening', () => ready());
            return server;
        };
        const boot = () => new Promise(resolve => {
            ready = resolve;
            delete require.cache[require.resolve('./index.js')];
            require('./index.js');
        });
        const close = () => new Promise(resolve => server.close(resolve));
        async function main() {
            try {
                await boot();
                let base = 'http://127.0.0.1:' + server.address().port;
                const request = (value, extraHeaders = {}) => fetch(base + '/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify({ key: 'siteSettings', value }) });
                let response = await request({ radioShadows: { menu: { custom: false } } });
                assert.equal(response.status, 401);
                response = await fetch(base + '/api/auth/validate-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
                assert.equal(response.status, 200);
                const cookie = response.headers.get('set-cookie').split(';')[0];
                const save = (value, origin = base) => request(value, { Cookie: cookie, Origin: origin });
                response = await save({ radioShadows: { menu: { custom: false } } }, 'https://wrong-origin.invalid');
                assert.equal(response.status, 403);
                const originalBytes = fs.readFileSync(file, 'utf8');
                for (const radioShadows of [null, [], 'bad', { unknown: { custom: true } }, { roots: null }, { roots: {} }, { roots: { custom: 1 } }, { roots: { length: '1' } }, { roots: { length: .09 } }, { roots: { length: 3.01 } }, { roots: { offsetX: -3.01 } }, { roots: { depthOffset: 1.01 } }, { roots: { opacity: .5 } }, JSON.parse('{"__proto__":{"custom":false}}')]) {
                    response = await save({ siteName: 'Do not save invalid patch', radioShadows });
                    assert.equal(response.status, 400);
                    assert.equal(fs.readFileSync(file, 'utf8'), originalBytes);
                }
                const roots = { custom: true, length: 1.3, offsetX: -.4, depthOffset: .28 };
                const menu = { custom: true, length: 1.8, offsetX: .3, depthOffset: -.1 };
                // Both tabs only send their dirty target, never their stale full branch.
                const responses = await Promise.all([save({ radioShadows: { roots } }), save({ radioShadows: { menu } })]);
                assert.deepEqual(responses.map(item => item.status), [200, 200]);
                const confirmations = await Promise.all(responses.map(item => item.json()));
                confirmations.forEach(result => { assert.equal(result.success, true); assert.equal(result.radioShadows.y2k.length, 1); });
                response = await save({ siteName: 'Renamed' });
                assert.equal(response.status, 200);
                let saved = JSON.parse(fs.readFileSync(file, 'utf8'));
                assert.deepEqual(saved.siteSettings.radioShadows, { y2k: fixture.siteSettings.radioShadows.y2k, roots, menu });
                assert.deepEqual(saved.siteSettings.visualEffects, originalEffects);
                assert.deepEqual(saved.siteSettings.menuCaptions, fixture.siteSettings.menuCaptions);
                assert.deepEqual(saved.siteSettings.customFuture, fixture.siteSettings.customFuture);
                for (const key of ['releases', 'stats', 'about', 'adminSettings']) assert.deepEqual(saved[key], fixture[key]);
                response = await save({ radioShadows: { roots: { custom: false } } });
                assert.equal(response.status, 200);
                saved = JSON.parse(fs.readFileSync(file, 'utf8'));
                assert.deepEqual(saved.siteSettings.radioShadows.roots, { ...roots, custom: false });
                await close();
                await boot();
                base = 'http://127.0.0.1:' + server.address().port;
                response = await fetch(base + '/api/data');
                assert.equal(response.status, 200);
                const publicPayload = await response.json();
                assert.deepEqual(publicPayload.siteSettings.radioShadows, saved.siteSettings.radioShadows);
                assert.deepEqual(publicPayload.siteSettings.visualEffects, originalEffects);
                assert.equal(publicPayload.siteSettings.siteName, 'Renamed');
                assert.equal(publicPayload.adminSettings, undefined);
                assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), saved);
                process.stdout.write('radio-shadow-persistence-ok');
            } finally {
                if (server?.listening) await close();
                express.application.listen = originalListen;
                fs.rmSync(folder, { recursive: true, force: true });
            }
        }
        main().catch(error => { console.error(error); process.exitCode = 1; });
    `;
    const result = await promisify(execFile)(process.execPath, ['-e', source], { cwd: __dirname, timeout: 15000, maxBuffer: 64 * 1024 });
    assert.equal(result.stderr, '');
    assert.ok(result.stdout.endsWith('radio-shadow-persistence-ok'));
});
