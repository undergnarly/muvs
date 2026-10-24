import test from 'node:test';
import assert from 'node:assert/strict';
import { createDustWind, resetDustWind, impulseDustWind, stepDustWind, observeDustGestures } from './dustWind.js';

test('both gesture axes give bounded world-space gusts without moving positions instantly', () => {
    const wind = createDustWind();
    impulseDustWind(wind, 0.2, 0.1, -1, 0, 0);
    assert.equal(wind.x, 0); assert.equal(wind.y, 0);
    assert.equal(wind.vx, -0.5); assert.equal(wind.vy, 0.25);
    stepDustWind(wind, 0.1);
    assert.ok(wind.x < 0 && wind.y > 0);
    for (let i = 0; i < 300; i++) { impulseDustWind(wind, 100, -100); stepDustWind(wind, 0.1); }
    assert.ok(Math.abs(wind.x) <= 0.55 && Math.abs(wind.y) <= 0.55);
    assert.ok(Math.abs(wind.vx) <= 1.1 && Math.abs(wind.vy) <= 1.1);
    resetDustWind(wind);
    assert.deepEqual(wind, createDustWind());
});

test('gust decay is frame-rate independent, smoothly reversible and settles completely', () => {
    const slow = createDustWind(); const fast = createDustWind();
    impulseDustWind(slow, 0.2, 0.1); impulseDustWind(fast, 0.2, 0.1);
    for (let i = 0; i < 60; i++) stepDustWind(slow, 1 / 30);
    for (let i = 0; i < 240; i++) stepDustWind(fast, 1 / 120);
    for (const key of Object.keys(slow)) assert.ok(Math.abs(slow[key] - fast[key]) < 1e-12, key);
    const x = slow.x; impulseDustWind(slow, -0.2, 0);
    assert.equal(slow.x, x, 'reversal affects velocity, never teleports a mote');
    for (let i = 0; i < 400; i++) stepDustWind(slow, 0.1);
    assert.ok(Object.values(slow).every(value => Math.abs(value) < 1e-10));
    const before = { ...fast };
    stepDustWind(fast, NaN); assert.deepEqual(fast, before);
});

function surface() {
    const listeners = new Map();
    const options = [];
    const events = {
        addEventListener(name, fn, opts) { listeners.set(name, fn); options.push(opts); },
        removeEventListener(name) { listeners.delete(name); },
    };
    let loading = false;
    const doc = { ...events, getElementById: () => loading };
    const target = { ...events, innerWidth: 400, innerHeight: 800 };
    const emitted = [];
    const cleanup = observeDustGestures((...args) => emitted.push(args), { doc, target });
    const point = (x, y, identifier = 1) => ({ clientX: x, clientY: y, identifier });
    const dispatch = (type, props = {}) => listeners.get(type)?.({ target: { closest: () => false }, ...props });
    return { listeners, options, target, emitted, point, dispatch, cleanup, setLoading: value => { loading = value; } };
}

test('passive touch observation handles both directions, cancellation and pinch without owning navigation', () => {
    const s = surface();
    s.dispatch('touchstart', { touches: [s.point(200, 400)] });
    s.dispatch('touchmove', { touches: [s.point(240, 320)] });
    assert.deepEqual(s.emitted.pop(), [0.1, 0.1]);
    s.dispatch('touchmove', { touches: [s.point(200, 400)] });
    assert.deepEqual(s.emitted.pop(), [-0.1, -0.1]);
    s.dispatch('touchcancel'); s.dispatch('touchmove', { touches: [s.point(300, 200)] });
    assert.equal(s.emitted.length, 0);
    s.dispatch('touchstart', { touches: [s.point(100, 100)] });
    s.dispatch('touchmove', { touches: [s.point(110, 100), s.point(120, 200, 2)] });
    s.dispatch('touchmove', { touches: [s.point(200, 300)] });
    assert.equal(s.emitted.length, 0);
    assert.ok(s.options.filter(Boolean).every(o => o.passive === true));
    s.cleanup(); assert.equal(s.listeners.size, 0);
});

test('controls/loading/ctrl-wheel are excluded; accepted navigation wheel remains passive and normalized', () => {
    const s = surface();
    s.dispatch('wheel', { deltaX: 40, deltaY: 80, deltaMode: 0, defaultPrevented: true });
    assert.deepEqual(s.emitted.pop(), [-0.1, 0.1]);
    s.dispatch('wheel', { deltaX: 2.5, deltaY: 5, deltaMode: 1 });
    assert.deepEqual(s.emitted.pop(), [-0.1, 0.1]);
    s.dispatch('wheel', { deltaX: 0, deltaY: 100, ctrlKey: true });
    s.dispatch('wheel', { deltaX: 0, deltaY: 100, target: { closest: () => ({}) } });
    s.setLoading(true); s.dispatch('wheel', { deltaX: 0, deltaY: 100 });
    assert.equal(s.emitted.length, 0);
    s.setLoading(false); s.dispatch('touchstart', { touches: [s.point(100, 100)] });
    s.dispatch('visibilitychange'); s.dispatch('touchmove', { touches: [s.point(200, 200)] });
    assert.equal(s.emitted.length, 0);
    s.cleanup();
});
