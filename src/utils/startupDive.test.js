import test from 'node:test';
import assert from 'node:assert/strict';
import { createStartupDive, guardStartupInput, startupDiveEase, STARTUP_DIVE_DURATION } from './startupDive.js';

function clock() {
    let time = 0;
    let id = 0;
    const queue = new Map();
    const events = [];
    const state = { visible: true, skip: false };
    const dive = createStartupDive({
        request: (fn) => { queue.set(++id, fn); return id; }, cancel: (key) => queue.delete(key),
        visible: () => state.visible, skip: () => state.skip,
        onStart: () => events.push(['start', time]), onProgress: (p) => events.push(['progress', p]),
        onFinish: () => events.push(['finish', time]),
    });
    return { dive, events, state, pending: () => queue.size, frame(delta = 16) {
        time += delta;
        const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(fn => fn(time));
    } };
}

test('shared flight is symmetric slow-fast-slow, bounded and exact at endpoints', () => {
    assert.equal(startupDiveEase(-1), 0);
    assert.equal(startupDiveEase(2), 1);
    assert.equal(startupDiveEase(NaN), 0);
    assert.equal(startupDiveEase(.5), .5);
    for (const t of [.01, .1, .3, .5, .8]) assert.ok(Math.abs(startupDiveEase(t) + startupDiveEase(1 - t) - 1) < 1e-12);
    assert.ok(startupDiveEase(.5) - startupDiveEase(.4) > startupDiveEase(.1));
});

test('complete drawing gets two visible paint frames and a short full-stamp dwell before departure', async () => {
    const c = clock();
    c.frame(); c.frame();
    assert.deepEqual(c.events, []);
    for (let i = 0; i < 6; i++) c.frame();
    assert.deepEqual(c.events, []);
    c.frame();
    assert.equal(c.events[0][0], 'start');
    for (let i = 0; i < Math.ceil(STARTUP_DIVE_DURATION / 16); i++) c.frame();
    assert.equal(await c.dive.finished, true);
    assert.equal(c.events.at(-1)[0], 'finish');
    assert.equal(c.events.at(-2)[1], 1);
    assert.equal(c.pending(), 0);
});

test('hidden loading and hidden flight freeze the same progress with no resume jump', async () => {
    const c = clock(); c.state.visible = false;
    c.frame(5000); c.frame(5000);
    assert.deepEqual(c.events, []);
    c.state.visible = true;
    for (let i = 0; i < 30; i++) c.frame();
    const before = c.events.at(-1);
    c.state.visible = false; c.frame(120000);
    assert.equal(c.events.at(-1), before);
    c.state.visible = true; c.frame(120000);
    assert.deepEqual(c.events.at(-1), before);
    for (let i = 0; i < 100; i++) c.frame();
    assert.equal(await c.dive.finished, true);
});

test('reduced motion and SaveData settle directly; cancellation never reveals or finishes late', async () => {
    const reduced = clock(); reduced.state.skip = true;
    for (let i = 0; i < 12; i++) reduced.frame();
    assert.equal(await reduced.dive.finished, true);
    assert.deepEqual(reduced.events.map(event => event[0]), ['start', 'progress', 'finish']);
    for (const count of [0, 30]) {
        const c = clock(); for (let i = 0; i < count; i++) c.frame();
        const events = c.events.slice(); c.dive.cancel(); c.dive.cancel(); c.frame(9000);
        assert.equal(await c.dive.finished, false);
        assert.deepEqual(c.events, events);
        assert.equal(c.pending(), 0);
    }
});

test('large visible stalls cannot skip the entire cinematic flight', () => {
    const c = clock(); for (let i = 0; i < 10; i++) c.frame();
    c.frame(10000);
    assert.ok(c.events.at(-1)[1] < .01);
    c.dive.cancel();
});

test('input shield blocks document handlers and focus but permits recovery and fully restores', () => {
    const listeners = new Map(); const root = { inert: false }; let removed = false; let failed = false;
    const doc = {
        getElementById: id => id === 'root' ? root : (removed ? null : { classList: { contains: () => failed } }),
        addEventListener: (type, fn, options) => { assert.equal(options.passive, false); assert.equal(options.capture, true); listeners.set(type, fn); },
        removeEventListener: (type, fn, capture) => { assert.equal(capture, true); assert.equal(listeners.get(type), fn); listeners.delete(type); },
    };
    const restore = guardStartupInput(doc); assert.equal(root.inert, true);
    for (const fn of listeners.values()) {
        let stopped = false; let prevented = false;
        const event = { cancelable: true, preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => { stopped = true; } };
        fn(event); assert.ok(stopped && prevented);
        stopped = prevented = false; event.target = { closest: () => true }; fn(event); assert.ok(!stopped && !prevented);
        event.target = null; failed = true; fn(event); assert.ok(!stopped && !prevented); failed = false;
        removed = true; fn(event); assert.ok(!stopped && !prevented); removed = false;
    }
    restore(); assert.equal(listeners.size, 0); assert.equal(root.inert, false);
});
