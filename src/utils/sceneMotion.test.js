import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneMotionTracker } from './sceneMotion.js';

function fixture() {
    let time = 0;
    const starts = [], ends = [];
    const tracker = createSceneMotionTracker({ now: () => time, start: d => starts.push(d), end: id => ends.push(id) });
    const sample = (x = 0, offset = 0) => { time += 16; return tracker.sample({ x, y: 3, z: 7 }, { x: 0, y: 2, z: 0 }, 40, offset); };
    return { tracker, starts, ends, sample, advance: ms => { time += ms; } };
}

test('accepted motion starts synchronously, never starts from idle camera sampling, and ends after base settling', () => {
    const f = fixture();
    f.sample(); assert.equal(f.starts.length, 0);
    const id = f.tracker.begin('swipe');
    assert.equal(f.starts[0].id, id);
    for (let i = 0; i < 12; i++) f.sample(i / 10);
    assert.equal(f.ends.length, 0);
    for (let i = 0; i < 4; i++) f.sample(1.1);
    assert.deepEqual(f.ends, [id]);
    f.sample(2); assert.equal(f.starts.length, 1);
});

test('carousel structural motion keeps film alive even when the camera remains on its centred line', () => {
    const f = fixture(); const id = f.tracker.begin('item');
    for (let i = 0; i < 20; i++) f.sample(0, i * .7);
    assert.equal(f.ends.length, 0);
    for (let i = 0; i < 4; i++) f.sample(0, 13.3);
    assert.deepEqual(f.ends, [id]);
});

test('retarget resets settling and only ends the newest accepted lease', () => {
    const f = fixture(); f.tracker.begin(); f.sample(); f.sample();
    const latest = f.tracker.begin('reverse');
    f.sample(); f.sample(); f.sample(); assert.equal(f.ends.length, 0);
    f.sample(); assert.deepEqual(f.ends, [latest]);
    f.tracker.cancel(); assert.equal(f.ends.length, 1);
});

test('static swap has a short minimum window while invalid/stalled renderer samples cannot hold forever', () => {
    const f = fixture(); const first = f.tracker.begin();
    f.sample(); f.sample(); f.sample(); assert.equal(f.ends.length, 0);
    f.sample(); assert.deepEqual(f.ends, [first]);
    const second = f.tracker.begin(); f.sample(NaN); f.advance(7800); f.sample(NaN);
    assert.deepEqual(f.ends, [first, second]);
});
