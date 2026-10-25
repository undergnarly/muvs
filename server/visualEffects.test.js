/* global require, process, __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

test('real settings API saves an isolated effects patch across restart without changing unrelated data', async () => {
    const source = String.raw`
        const assert = require('node:assert/strict');
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const crypto = require('node:crypto');
        const express = require('express');
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'muvs-effects-test-'));
        process.env.DATA_DIR = folder;
        const pin = crypto.randomBytes(16).toString('hex');
        const salt = crypto.randomBytes(16).toString('hex');
        const fixture = {
            adminSettings: { pinSalt: salt, pinHash: crypto.scryptSync(pin, salt, 64).toString('hex') },
            siteSettings: { siteName: 'Fixture', menuCaptions: { music: 'Keep this' }, customFuture: { keep: true } },
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
                let response = await fetch(base + '/api/visual-effects');
                assert.equal(response.status, 200);
                assert.equal(response.headers.get('cache-control'), 'no-store');
                assert.deepEqual(await response.json(), { visualEffects: {} });
                response = await fetch(base + '/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'siteSettings', value: { visualEffects: {} } }) });
                assert.equal(response.status, 401);
                response = await fetch(base + '/api/auth/validate-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
                assert.equal(response.status, 200);
                const cookie = response.headers.get('set-cookie').split(';')[0];
                const effects = { transition: { opacity: .42, durationSeconds: 1.2, effectDurationSeconds: .5, fadeOutMs: 180 }, lightLeaks: { enabled: false }, filmDust: { opacity: .22, intervalMinSeconds: 12, intervalMaxSeconds: 20 }, handheld: { strength: 3, speed: .75 }, shadows: { enabled: true, opacity: .31, directionDegrees: 143, length: 1.2, blur: .4, depthOffset: .15 }, menuCaptions: { color: '#c0ffee' } };
                const save = (value, origin = base) => fetch(base + '/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: origin }, body: JSON.stringify({ key: 'siteSettings', value }) });
                response = await save({ visualEffects: effects }, 'https://wrong-origin.invalid');
                assert.equal(response.status, 403);
                response = await save({ visualEffects: effects });
                assert.equal(response.status, 200); assert.equal((await response.json()).success, true);
                assert.deepEqual((await (await fetch(base + '/api/visual-effects')).json()), { visualEffects: effects });
                response = await save({ siteName: 'Renamed' });
                assert.equal(response.status, 200);
                const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
                assert.deepEqual(saved.siteSettings.visualEffects, effects);
                assert.equal(saved.siteSettings.visualEffects.menuCaptions.color, '#c0ffee');
                assert.deepEqual(saved.siteSettings.menuCaptions, fixture.siteSettings.menuCaptions);
                assert.deepEqual(saved.siteSettings.customFuture, fixture.siteSettings.customFuture);
                for (const key of ['releases', 'stats', 'about', 'adminSettings']) assert.deepEqual(saved[key], fixture[key]);
                await close();
                await boot();
                base = 'http://127.0.0.1:' + server.address().port;
                response = await fetch(base + '/api/visual-effects');
                assert.deepEqual(await response.json(), { visualEffects: effects });
                assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).siteSettings.visualEffects.menuCaptions.color, '#c0ffee');
                process.stdout.write('effects-persistence-ok');
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
    assert.ok(result.stdout.endsWith('effects-persistence-ok'));
});
