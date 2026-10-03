import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartupGate, settleWithin } from './menuStartupGate.js';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

function clock() {
    let time = 0;
    let sequence = 0;
    const timers = new Map();
    return {
        schedule(callback, delay) {
            const id = ++sequence;
            timers.set(id, { callback, at: time + delay });
            return id;
        },
        cancel(id) { timers.delete(id); },
        advance(delta) {
            time += delta;
            for (const [id, timer] of timers) {
                if (timer.at <= time) { timers.delete(id); timer.callback(); }
            }
        },
        pending: () => timers.size,
    };
}

const flush = async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
};

test('settleWithin preserves success and clears its timer', async () => {
    const time = clock();
    const expected = { texture: true };
    assert.equal(await settleWithin(Promise.resolve(expected), 8000, time.schedule, time.cancel), expected);
    assert.equal(time.pending(), 0);
});

test('optional media rejection and timeout resolve false, including late rejection', async () => {
    const time = clock();
    assert.equal(await settleWithin(Promise.reject(new Error('Video failed')), 8000, time.schedule, time.cancel), false);
    assert.equal(time.pending(), 0);
    const hung = deferred();
    let completed = false;
    const result = settleWithin(hung.promise, 8000, time.schedule, time.cancel);
    result.then(() => { completed = true; });
    time.advance(7999);
    await flush();
    assert.equal(completed, false);
    time.advance(1);
    assert.equal(await result, false);
    assert.equal(time.pending(), 0);
    hung.reject(new Error('Late network failure'));
    await flush();
    assert.equal(await result, false);
});

test('preparation and startup each deduplicate, including prepare before start', async () => {
    const fallback = deferred();
    const rendered = deferred();
    let prepared = 0;
    let renderWaits = 0;
    const gate = createStartupGate({
        prepare: () => { prepared += 1; return fallback.promise; },
        waitForRender: () => { renderWaits += 1; return rendered.promise; },
    });
    const preparation = gate.prepare();
    assert.equal(gate.prepare(), preparation);
    const started = gate.start();
    assert.equal(gate.start(), started);
    await flush();
    assert.equal(prepared, 1);
    assert.equal(renderWaits, 1);
    fallback.resolve();
    rendered.resolve();
    await started;
    assert.equal(gate.start(), started);
    assert.equal(gate.prepare(), preparation);
});

test('posters and videos start in parallel and time out together, but fallback and render remain mandatory', async () => {
    const time = clock();
    const fallback = deferred();
    const poster = deferred();
    const video = deferred();
    const rendered = deferred();
    const calls = [];
    const gate = createStartupGate({
        prepare: () => {
            calls.push('fallback');
            const fallbackReady = fallback.promise;
            calls.push('poster');
            const posterReady = settleWithin(poster.promise, 8000, time.schedule, time.cancel);
            calls.push('video');
            const videoReady = settleWithin(video.promise, 8000, time.schedule, time.cancel);
            return Promise.all([fallbackReady, posterReady, videoReady]);
        },
        waitForRender: () => rendered.promise,
    });
    let revealed = false;
    const started = gate.start().then(() => { revealed = true; });
    await flush();
    assert.deepEqual(calls, ['fallback', 'poster', 'video']);
    assert.equal(time.pending(), 2);
    time.advance(8000);
    await flush();
    assert.equal(time.pending(), 0);
    assert.equal(revealed, false, 'optional timeout cannot bypass an unresolved inline fallback');
    fallback.resolve();
    await flush();
    assert.equal(revealed, false, 'prepared assets cannot bypass first scene render');
    rendered.resolve();
    await started;
    assert.equal(revealed, true);
});

test('a first-frame signal before start is retained; a fast load has no fixed artificial delay', async () => {
    const rendered = deferred();
    rendered.resolve();
    const time = clock();
    const gate = createStartupGate({
        prepare: () => Promise.all([
            Promise.resolve('inline fallback decoded'),
            settleWithin(Promise.resolve('poster'), 8000, time.schedule, time.cancel),
            settleWithin(Promise.reject(new Error('Video unavailable')), 8000, time.schedule, time.cancel),
        ]),
        waitForRender: () => rendered.promise,
    });
    await gate.start();
    assert.equal(time.pending(), 0);
});

test('mandatory fallback/render failures never become a successful reveal and remain deduplicated', async () => {
    for (const failing of ['prepare', 'waitForRender']) {
        let attempts = 0;
        const error = new Error(`${failing} failed`);
        const gate = createStartupGate({
            prepare: () => Promise.resolve(),
            waitForRender: () => Promise.resolve(),
            [failing]: () => { attempts += 1; throw error; },
        });
        const result = gate.start();
        await assert.rejects(result, error);
        assert.equal(gate.start(), result);
        await assert.rejects(gate.start(), error);
        assert.equal(attempts, 1);
    }
});
