import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyTitleGlyphStretch, createMenuTitleStretch, measureTitleGlyphs,
    titleStretchStrength, warpTitleCoordinate,
} from './menuTitleStretch.js';

const frame = { delta: 0.02, index: 0, mobile: true, menu: true, ready: true, settled: true, visible: true, skip: false };

test('shared selection waits for appearance then eases outward over1.6s', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, ready: false }), 0);
    assert.equal(timeline.sample({ ...frame, settled: false }), 0);
    for (let i = 0; i < 10; i++) assert.equal(timeline.sample(frame), 0);
    let previous = 0;
    for (let i = 0; i < 81; i++) {
        const progress = timeline.sample(frame);
        assert.ok(progress >= previous && progress <= 1);
        previous = progress;
    }
    assert.equal(previous, 1);
    assert.equal(timeline.sample(frame), 1);
});

test('hidden time freezes; selection and section changes cancel/replay, desktop is unchanged', () => {
    const timeline = createMenuTitleStretch();
    for (let i = 0; i < 25; i++) timeline.sample(frame);
    const progress = timeline.progress;
    assert.ok(progress > 0);
    for (let i = 0; i < 100; i++) assert.equal(timeline.sample({ ...frame, visible: false }), progress);
    assert.equal(timeline.visible, false);
    assert.equal(timeline.sample({ ...frame, index: 1 }), 0);
    assert.equal(timeline.visible, true);
    for (let i = 0; i < 25; i++) timeline.sample({ ...frame, index: 1 });
    assert.equal(timeline.sample({ ...frame, index: 1, menu: false }), 0);
    assert.equal(timeline.sample({ ...frame, index: 1 }), 0);
    assert.equal(timeline.sample({ ...frame, mobile: false, skip: true }), 0);
    assert.equal(timeline.sample({ ...frame, skip: true }), 1);
});

test('frame spikes and invalid/negative deltas cannot jump the entrance', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, delta: 30 }), 0);
    assert.equal(timeline.sample({ ...frame, delta: -10 }), 0);
    assert.equal(timeline.sample({ ...frame, delta: NaN }), 0);
});

test('convex symmetric warp preserves center and increases edge-glyph width progressively', () => {
    const center = 0;
    const half = 2;
    const strength = 0.7;
    assert.equal(warpTitleCoordinate(0, center, half, strength), 0);
    assert.equal(warpTitleCoordinate(-2, center, half, strength), -warpTitleCoordinate(2, center, half, strength));
    const width = (x) => warpTitleCoordinate(x + 0.1, center, half, strength)
        - warpTitleCoordinate(x - 0.1, center, half, strength);
    assert.ok(width(0) < 0.201);
    assert.ok(width(0.8) > width(0));
    assert.ok(width(1.8) > width(0.8));
    assert.equal(warpTitleCoordinate(2, 0, 0, 1), 2);
});

test('SDF bounds change only x, do not mutate the source and match the requested visible width', () => {
    const bounds = new Float32Array([-2.2, -0.1, -0.8, 1.1, -0.7, -0.1, 0.7, 1.1, 0.8, -0.1, 2.2, 1.1]);
    const original = bounds.slice();
    const visible = [-2, 0, 2, 1];
    const metrics = measureTitleGlyphs(bounds, visible);
    const target = bounds.slice();
    const strength = titleStretchStrength(metrics, 6, 1);
    applyTitleGlyphStretch(target, metrics, strength);
    const left = target[0] + (target[2] - target[0]) * ((-2 - bounds[0]) / (bounds[2] - bounds[0]));
    const right = target[8] + (target[10] - target[8]) * ((2 - bounds[8]) / (bounds[10] - bounds[8]));
    assert.ok(Math.abs(right - left - 6) < 0.000001);
    assert.deepEqual(bounds, original);
    for (let i = 0; i < bounds.length; i += 4) {
        assert.equal(target[i + 1], bounds[i + 1]);
        assert.equal(target[i + 3], bounds[i + 3]);
        assert.ok(target[i + 2] > target[i]);
    }
    assert.equal(target[4], -target[6]);
    applyTitleGlyphStretch(target, metrics, 0);
    assert.deepEqual(target, original);
});

test('already-wide titles are never compressed and missing metrics leave fonts untouched', () => {
    const metrics = measureTitleGlyphs(new Float32Array([-2, 0, 2, 1]), [-2, 0, 2, 1]);
    assert.equal(titleStretchStrength(metrics, 3, 1), 0);
    assert.equal(titleStretchStrength(metrics, NaN, 1), 0);
    assert.equal(measureTitleGlyphs([], [0, 0, 0, 0]), null);
    assert.equal(measureTitleGlyphs(new Float32Array([-2, 0, 2, 1]), [0, 0, 0, 0]), null);
});
