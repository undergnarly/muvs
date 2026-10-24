import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmedDataWriter } from './confirmedDataSave.js';

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
