import test from 'node:test';
import assert from 'node:assert/strict';
import { ATMOSPHERE_MOTES, atmosphereMotionMode, observeAtmosphereMotion } from './atmosphere.js';

test('sparse deterministic three-depth layout stays bounded and lighter on phones', () => {
    assert.equal(ATMOSPHERE_MOTES.length, 16);
    assert.equal(ATMOSPHERE_MOTES.filter((mote) => !mote.desktop).length, 12);
    for (const mote of ATMOSPHERE_MOTES) {
        assert.ok(mote.x >= 0 && mote.x <= 100);
        assert.ok(mote.duration >= 74 && mote.duration <= 186);
        assert.ok(mote.delay < 0 && -mote.delay < mote.duration);
        assert.ok(mote.size >= 14 && mote.size <= 92 && Math.abs(mote.dx) <= 32);
    }
    const sizes = (depth) => ATMOSPHERE_MOTES.filter((mote) => mote.depth === depth).map((mote) => mote.size);
    assert.ok(Math.max(...sizes('far')) < Math.min(...sizes('middle')));
    assert.ok(Math.max(...sizes('middle')) < Math.min(...sizes('near')));
    const durations = (depth) => ATMOSPHERE_MOTES.filter((mote) => mote.depth === depth).map((mote) => mote.duration);
    assert.ok(Math.min(...durations('far')) > Math.max(...durations('middle')));
    assert.ok(Math.min(...durations('middle')) > Math.max(...durations('near')));
});

test('preferences keep grain only; hidden and floor views pause', () => {
    assert.equal(atmosphereMotionMode(), 'running');
    assert.equal(atmosphereMotionMode({ loading: true }), 'waiting');
    assert.equal(atmosphereMotionMode({ hidden: true }), 'paused');
    assert.equal(atmosphereMotionMode({ paused: true }), 'paused');
    assert.equal(atmosphereMotionMode({ reduced: true, hidden: true }), 'still');
    assert.equal(atmosphereMotionMode({ saveData: true, loading: true }), 'still');
});

const events = () => {
    const handlers = new Map();
    return {
        handlers,
        addEventListener(type, callback) { handlers.set(type, callback); },
        removeEventListener(type, callback) { if (handlers.get(type) === callback) handlers.delete(type); },
        fire(type) { handlers.get(type)?.(); },
    };
};

test('startup, preference changes, visibility and cleanup are event-driven', () => {
    const doc = { ...events(), body: {}, visibilityState: 'visible', loading: true, getElementById() { return this.loading ? {} : null; } };
    const preference = { ...events(), matches: false };
    const connection = { ...events(), saveData: false };
    let observer;
    const win = { matchMedia: () => preference, MutationObserver: class {
        constructor(callback) { this.callback = callback; observer = this; }
        observe(target, options) { this.target = target; this.options = options; }
        disconnect() { this.disconnected = true; }
    } };
    const modes = [];
    const stop = observeAtmosphereMotion((mode) => modes.push(mode), { doc, win, connection });
    assert.deepEqual(modes, ['waiting']);
    assert.equal(observer.target, doc.body);
    assert.deepEqual(observer.options, { childList: true });
    doc.loading = false; observer.callback();
    assert.equal(observer.disconnected, true);
    doc.visibilityState = 'hidden'; doc.fire('visibilitychange');
    doc.visibilityState = 'visible'; doc.fire('visibilitychange');
    preference.matches = true; preference.fire('change');
    preference.fire('change');
    preference.matches = false; preference.fire('change');
    connection.saveData = true; connection.fire('change');
    connection.saveData = false; connection.fire('change');
    assert.deepEqual(modes, ['waiting', 'running', 'paused', 'running', 'still', 'running', 'still', 'running']);
    stop();
    assert.equal(doc.handlers.size + preference.handlers.size + connection.handlers.size, 0);
});

test('unmount while loading disconnects the only observer; no browser network preference is required', () => {
    let disconnected = false;
    const doc = { ...events(), body: {}, getElementById: () => ({}) };
    const win = { MutationObserver: class { observe() {} disconnect() { disconnected = true; } } };
    const modes = [];
    const stop = observeAtmosphereMotion((mode) => modes.push(mode), { doc, win, connection: undefined, paused: true });
    assert.deepEqual(modes, ['paused']);
    stop();
    assert.equal(disconnected, true);
    assert.equal(doc.handlers.size, 0);
});

test('already revealed pages need no mutation observer and preferences may be unavailable', () => {
    let observers = 0;
    const doc = { ...events(), visibilityState: 'visible', getElementById: () => null };
    const win = { MutationObserver: class { constructor() { observers++; } } };
    const modes = [];
    const stop = observeAtmosphereMotion((mode) => modes.push(mode), { doc, win, connection: undefined });
    assert.deepEqual(modes, ['running']);
    assert.equal(observers, 0);
    doc.visibilityState = 'hidden'; doc.fire('visibilitychange'); doc.fire('visibilitychange');
    assert.deepEqual(modes, ['running', 'paused']);
    stop();
    doc.visibilityState = 'visible'; doc.fire('visibilitychange');
    assert.deepEqual(modes, ['running', 'paused']);
});
