import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmedDataWriter, mergeConfirmedSiteSettings, saveConfirmedSiteSettings } from './confirmedDataSave.js';

test('settings save captures the submitted snapshot and returns only an acknowledged result', async () => {
    let resolve; let request;
    const settings = { radioShadows: { menu: { custom: true, length: 2, offsetX: .1, depthOffset: .2 } } };
    const pending = saveConfirmedSiteSettings(settings, { fetchImpl: (...args) => { request = args; return new Promise(done => { resolve = done; }); } });
    settings.radioShadows.menu.length = 3;
    assert.equal(JSON.parse(request[1].body).value.radioShadows.menu.length, 2);
    assert.equal(request[0], '/api/data');
    const result = { success: true, radioShadows: { menu: { custom: true, length: 2, offsetX: .1, depthOffset: .2 } } };
    resolve({ ok: true, json: async () => result });
    const saved = await pending;
    assert.deepEqual(saved, { result, submitted: { radioShadows: { menu: { custom: true, length: 2, offsetX: .1, depthOffset: .2 } } } });
    assert.equal(request[1].signal.aborted, false);
});

test('a hanging settings fetch aborts at its deadline, preserves state after a late success and allows retry', async () => {
    let late; let signal; let committed = 0;
    const settings = { radioShadows: { roots: { custom: false } } };
    const pending = saveConfirmedSiteSettings(settings, { timeoutMs: 5,
        fetchImpl: async (_, options) => { signal = options.signal; return new Promise(resolve => { late = resolve; }); },
    }).then(result => { committed++; return result; });
    await assert.rejects(pending, /timed out.*draft is still here/i);
    assert.equal(signal.aborted, true);
    assert.equal(committed, 0);
    late({ ok: true, json: async () => ({ success: true }) });
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    assert.equal(committed, 0);
    const retry = await saveConfirmedSiteSettings(settings, { fetchImpl: async () => ({ ok: true, json: async () => ({ success: true }) }) });
    assert.equal(retry.result.success, true);
    assert.deepEqual(settings, { radioShadows: { roots: { custom: false } } });
});

test('the settings deadline also bounds a stalled response body, and malformed or rejected responses remain retryable', async () => {
    let lateBody; let signal;
    const hangingBody = saveConfirmedSiteSettings({}, { timeoutMs: 5, fetchImpl: async (_, options) => {
        signal = options.signal;
        return { ok: true, json: () => new Promise(resolve => { lateBody = resolve; }) };
    } });
    await assert.rejects(hangingBody, /timed out/);
    assert.equal(signal.aborted, true);
    lateBody({ success: true });
    for (const fetchImpl of [async () => ({ ok: false, status: 401 }), async () => ({ ok: false, status: 403 }), async () => ({ ok: false, status: 500 }),
        async () => { throw new TypeError('Network error'); }, async () => ({ ok: true, json: async () => ({ success: false }) }),
        async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })]) {
        await assert.rejects(saveConfirmedSiteSettings({}, { fetchImpl }), /retry|Sign in again/i);
    }
    let requests = 0;
    for (const invalid of [null, undefined, [], true, 'bad']) {
        await assert.rejects(saveConfirmedSiteSettings(invalid, { fetchImpl: () => { requests++; } }), /Invalid settings/);
    }
    assert.equal(requests, 0);
});

test('confirmed settings patches keep unrelated data and prefer acknowledged values only for submitted Radio targets', () => {
    const previous = { siteName: 'Keep', visualEffects: { shadows: { opacity: .91 } }, radioShadows: { roots: { custom: false } } };
    const submitted = { radioShadows: { menu: { custom: true, length: 2, offsetX: .1, depthOffset: .2 } } };
    const confirmed = { radioShadows: { menu: { ...submitted.radioShadows.menu, offsetX: .15 }, y2k: { custom: false } } };
    assert.deepEqual(mergeConfirmedSiteSettings(previous, submitted, confirmed), {
        ...previous, radioShadows: { ...previous.radioShadows, ...confirmed.radioShadows },
    });
    assert.deepEqual(mergeConfirmedSiteSettings(previous, submitted).radioShadows, { ...previous.radioShadows, ...submitted.radioShadows });
    assert.deepEqual(mergeConfirmedSiteSettings(previous, { siteName: 'New' }), { ...previous, siteName: 'New' });
    assert.equal(previous.siteName, 'Keep');
});

test('a late full Radio confirmation cannot undo a newer acknowledged edit to a different existing target', () => {
    const original = { radioShadows: { roots: { custom: true, length: 1 }, menu: { custom: true, length: 1 } } };
    const rootsPatch = { radioShadows: { roots: { custom: true, length: 2 } } };
    const menuPatch = { radioShadows: { menu: { custom: true, length: 3 } } };
    const staleRootsConfirmation = { radioShadows: { roots: rootsPatch.radioShadows.roots, menu: original.radioShadows.menu } };
    const menuConfirmation = { radioShadows: { roots: rootsPatch.radioShadows.roots, menu: menuPatch.radioShadows.menu } };
    const newer = mergeConfirmedSiteSettings(original, menuPatch, menuConfirmation);
    const afterLate = mergeConfirmedSiteSettings(newer, rootsPatch, staleRootsConfirmation);
    assert.deepEqual(afterLate.radioShadows, { roots: rootsPatch.radioShadows.roots, menu: menuPatch.radioShadows.menu });
});

test('content commits only after a successful acknowledged response; it commits the exact submitted snapshot', async () => {
    let resolve; const commits = []; let request;
    const writer = createConfirmedDataWriter({ fetchImpl: (...args) => { request = args; return new Promise(done => { resolve = done; }); }, onCommit: (...args) => commits.push(args) });
    const value = [{ id: 1, title: 'Veiled' }]; const pending = writer('releases', value);
    value[0].title = 'Another draft'; assert.equal(commits.length, 0);
    assert.deepEqual(JSON.parse(request[1].body), { key: 'releases', value: [{ id: 1, title: 'Veiled' }] });
    resolve({ ok: true, json: async () => ({ success: true }) }); await pending;
    assert.deepEqual(commits, [['releases', [{ id: 1, title: 'Veiled' }]]]);
});

test('HTTP auth/server errors, rejected fetch and unconfirmed/malformed JSON never commit and remain retryable', async () => {
    for (const failure of [async () => ({ ok: false, status: 401 }), async () => ({ ok: false, status: 403 }), async () => ({ ok: false, status: 500 }),
        async () => { throw new TypeError('Network error'); }, async () => ({ ok: true, json: async () => ({ success: false }) }),
        async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })]) {
        let fail = true; const commits = [];
        const writer = createConfirmedDataWriter({ fetchImpl: (...args) => fail ? failure(...args) : Promise.resolve({ ok: true, json: async () => ({ success: true }) }), onCommit: (...args) => commits.push(args) });
        await assert.rejects(writer('news', [{ title: 'Draft' }]), /retry|Sign in again/i);
        assert.equal(commits.length, 0); fail = false; await writer('news', [{ title: 'Draft' }]); assert.equal(commits.length, 1);
    }
});

test('invalid keys and invalid value shapes cannot send a request; newsSettings is explicitly supported', async () => {
    const requests = []; const commits = [];
    const writer = createConfirmedDataWriter({ fetchImpl: async (...args) => { requests.push(args); return { ok: true, json: async () => ({ success: true }) }; }, onCommit: (...args) => commits.push(args) });
    for (const [key, value] of [['stats', {}], ['siteSettings', {}], ['adminSettings', {}], ['unknown', []], ['news', {}], ['about', []], ['newsSettings', null]]) await assert.rejects(writer(key, value));
    assert.equal(requests.length, 0);
    await writer('newsSettings', { title: 'News page' });
    assert.deepEqual(commits, [['newsSettings', { title: 'News page' }]]);
});

test('a forbidden request is not falsely described as an expired session', async () => {
    const writer = createConfirmedDataWriter({ fetchImpl: async () => ({ ok: false, status: 403 }) });
    await assert.rejects(writer('about', {}), error => /blocked this save/.test(error.message) && !/expired/.test(error.message));
});

test('simultaneous saves to the same collection are rejected instead of racing; independent collections still work', async () => {
    let resolve; let calls = 0;
    const writer = createConfirmedDataWriter({ fetchImpl: async () => { calls++; if (calls === 1) return new Promise(done => { resolve = done; }); return { ok: true, json: async () => ({ success: true }) }; } });
    const first = writer('projects', [{ title: 'A' }]);
    await assert.rejects(writer('projects', [{ title: 'B' }]), /already in progress/); assert.equal(calls, 1);
    await writer('newsSettings', {}); assert.equal(calls, 2);
    resolve({ ok: true, json: async () => ({ success: true }) }); await first;
    await writer('projects', [{ title: 'C' }]); assert.equal(calls, 3);
});

test('a stalled save times out, never commits a late response, and releases the retry guard', async () => {
    let late; let slow = true; let signal; const commits = [];
    const writer = createConfirmedDataWriter({ timeoutMs: 5, onCommit: (...args) => commits.push(args),
        fetchImpl: async (_, options) => { signal = options.signal; return slow ? new Promise(resolve => { late = resolve; }) : { ok: true, json: async () => ({ success: true }) }; } });
    await assert.rejects(writer('about', { title: 'Draft' }), /timed out/);
    assert.equal(signal.aborted, true); assert.equal(commits.length, 0);
    late({ ok: true, json: async () => ({ success: true }) }); await Promise.resolve(); await Promise.resolve();
    assert.equal(commits.length, 0);
    slow = false; await writer('about', { title: 'Draft' }); assert.equal(commits.length, 1);
});
