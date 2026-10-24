import test from 'node:test';
import assert from 'node:assert/strict';
import { startSettlingFrame } from './settlingFrame.js';
import { sceneDampingAlpha } from './visualMotionTiming.js';

function harness(value = 0, goal = 1) {
    let now = 0, id = 0; const frames = new Map(), listeners = new Map(), deltas = [];
    const state = { value, goal, visibility: { hidden: false,
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: name => listeners.delete(name) }, frames, deltas };
    state.start = () => startSettlingFrame({ read: () => state.value, target: () => state.goal,
        write: next => { state.value = next; }, alpha: delta => { deltas.push(delta); return sceneDampingAlpha(delta, .7); }, epsilon: .0005,
        request: callback => { frames.set(++id, callback); return id; }, cancel: key => frames.delete(key),
        clock: () => now, visibility: state.visibility });
    state.step = (ms = 1000 / 60) => { now += ms; const next = [...frames.values()]; frames.clear(); next.forEach(callback => callback(now)); };
    state.hide = hidden => { state.visibility.hidden = hidden; listeners.get('visibilitychange')?.(); };
    return state;
}

test('settling interpolation reaches exact target then schedules no idle frames', () => {
    const h = harness(); const dispose = h.start();
    for (let i = 0; i < 100; i++) h.step();
    assert.equal(h.value, 1); assert.equal(h.frames.size, 0);
    dispose(); assert.equal(h.frames.size, 0);
    const idle = harness(1, 1); idle.start(); assert.equal(idle.frames.size, 0);
});

test('hidden/resumed and retargeted loops have no catch-up jump or stale frame', () => {
    const h = harness(); let dispose = h.start(); h.step(); const before = h.value;
    h.hide(true); assert.equal(h.frames.size, 0); h.step(30000); assert.equal(h.value, before);
    h.hide(false); h.step(); assert.ok(h.deltas.at(-1) < .02);
    dispose(); assert.equal(h.frames.size, 0); h.goal = -.5; dispose = h.start();
    for (let i = 0; i < 100; i++) h.step();
    assert.equal(h.value, -.5); assert.equal(h.frames.size, 0); dispose();
});
