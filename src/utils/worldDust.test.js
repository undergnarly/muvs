import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import {
    createWorldDustField, updateWorldDustField, sampleWorldDust, worldDustDistanceOpacity,
    WORLD_DUST_CELL_SIZE, WORLD_DUST_COUNT, WORLD_DUST_WRAP_X, advanceWorldDustField, worldDustRiseGain, sampleWorldDustFrame,
} from './worldDust.js';

const close = (a, b, epsilon = 0.00003) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const fieldAt = (x = 56, y = 2.6, z = -20) => {
    const field = createWorldDustField();
    updateWorldDustField(field, { x, y, z });
    return field;
};
function samples(field, time = 20) {
    return Array.from({ length: WORLD_DUST_COUNT }, (_, index) => sampleWorldDust(field, index, time));
}

test('world field has a fixed single-draw budget, deterministic bounded finite data, and no per-frame rebuild', () => {
    const first = fieldAt();
    const second = fieldAt();
    assert.equal(WORLD_DUST_COUNT, 1500);
    assert.deepEqual(first, second);
    assert.equal(updateWorldDustField(first, { x: 57, y: 3, z: -19 }), false);
    for (const data of [first.anchors, first.motion, first.style]) assert.ok(data.every(Number.isFinite));
    for (const mote of samples(first, 1e6)) {
        assert.ok(Object.values(mote).every(Number.isFinite));
        assert.ok(mote.radius >= 0.099 && mote.radius <= 0.341);
        assert.ok(mote.opacity >= 0 && mote.opacity <= 0.341);
    }
    const anchors = first.anchors;
    assert.equal(updateWorldDustField(first, { x: 700, y: 55, z: -300 }), true);
    assert.equal(first.anchors, anchors);
    assert.ok(first.anchors.every(Number.isFinite));
    updateWorldDustField(first, { x: NaN, y: Infinity, z: undefined });
    assert.ok(first.anchors.every(Number.isFinite));
});

test('integrated depth velocity is stronger nearby and camera motion does not teleport phases', () => {
    assert.equal(worldDustRiseGain(25), 2);
    assert.equal(worldDustRiseGain(196), 0.55);
    assert.ok(worldDustRiseGain(49) > worldDustRiseGain(144) * 2);
    const field = fieldAt(55);
    const before = field.rise.slice();
    advanceWorldDustField(field, { x: 56, y: 2.6, z: -20 }, 0);
    assert.deepEqual(field.rise, before);
    advanceWorldDustField(field, { x: 56, y: 2.6, z: -12 }, 0);
    assert.deepEqual(field.rise, before, 'camera changes velocity, not accumulated position');
    advanceWorldDustField(field, { x: 56, y: 2.6, z: -20 }, 0.1);
    const phases = new Map(field.keys.map((key, i) => [key, field.rise[i]]));
    updateWorldDustField(field, { x: 57, y: 2.6, z: -20 });
    let preserved = 0;
    field.keys.forEach((key, i) => {
        if (phases.has(key)) { assert.equal(field.rise[i], phases.get(key)); preserved++; }
    });
    assert.equal(preserved, 1200);
    const next = field.rise.slice();
    updateWorldDustField(field, { x: 57 + 56, y: 2.6, z: -20 });
    assert.deepEqual(field.rise, next, 'all phases survive physical ring recentering');
});

test('integrated rise stays bounded and converges across display frame rates', () => {
    const slow = fieldAt(); const fast = fieldAt();
    const camera = { x: 56, y: 2.6, z: -20 };
    for (let i = 0; i < 30; i++) advanceWorldDustField(slow, camera, 1 / 30);
    for (let i = 0; i < 120; i++) advanceWorldDustField(fast, camera, 1 / 120);
    for (let i = 0; i < WORLD_DUST_COUNT; i++) {
        assert.ok(slow.rise[i] >= 0 && slow.rise[i] < 8);
        const difference = Math.abs(slow.rise[i] - fast.rise[i]);
        // A wrap changes the local cell height while fully invisible; even
        // across that boundary integration stays within subpixel world error.
        assert.ok(Math.min(difference, 8 - difference) < 0.002);
    }
});

test('equal motes near the camera rise over five times faster on screen than distant motes', () => {
    const field = createWorldDustField();
    field.anchors.set([0, 0, -15, 0, 0, -8]);
    field.rise[0] = field.rise[1] = 2.6;
    field.motion[1] = field.motion[5] = 0.07;
    const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 200);
    camera.position.set(0, 2.6, -20); camera.lookAt(0, 2.5, -9); camera.updateMatrixWorld();
    const before = [0, 1].map(i => new Vector3(0, field.rise[i], field.anchors[i * 3 + 2]).project(camera).y);
    advanceWorldDustField(field, camera.position, 0.1);
    const after = [0, 1].map(i => new Vector3(0, field.rise[i], field.anchors[i * 3 + 2]).project(camera).y);
    assert.ok(field.rise[0] - 2.6 > (field.rise[1] - 2.6) * 2);
    assert.ok(after[0] - before[0] > (after[1] - before[1]) * 5);
});

test('actual integrated sample follows smooth curved world drift and bounded two-axis gusts', () => {
    const field = fieldAt();
    const before = sampleWorldDustFrame(field, 3, 20);
    const next = sampleWorldDustFrame(field, 3, 20.016);
    assert.ok(Math.hypot(next.x - before.x, next.z - before.z) > 0);
    assert.ok(Math.hypot(next.x - before.x, next.z - before.z) < 0.005);
    const gust = sampleWorldDustFrame(field, 3, 20, { x: 0.2, y: 0.1, z: -0.1 });
    assert.ok(gust.x > before.x && gust.y > before.y && gust.z < before.z);
    assert.ok(gust.x - before.x <= 0.2 && gust.y - before.y <= 0.1);
});

test('camera cell recycling preserves every overlapping world anchor and motion phase', () => {
    const before = samples(fieldAt(55));
    const after = samples(fieldAt(57));
    const key = ({ x, y, z }) => `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
    const prior = new Set(before.map(key));
    assert.equal(after.filter((mote) => prior.has(key(mote))).length, 1200);
    assert.equal(worldDustDistanceOpacity(15), 0);
    assert.equal(worldDustDistanceOpacity(16 - 0.96), 0, 'incoming cells stay invisible even with maximum curve and gust');
    assert.equal(worldDustDistanceOpacity(0), 0);
    assert.equal(worldDustDistanceOpacity(6), 1);
});

test('56-unit menu recentering preserves projected layout, sizes and rising phases', () => {
    const first = samples(fieldAt(56), 37);
    const wrapped = samples(fieldAt(56 + WORLD_DUST_WRAP_X), 37);
    for (let index = 0; index < first.length; index++) {
        close(wrapped[index].x - first[index].x, WORLD_DUST_WRAP_X);
        close(wrapped[index].y, first[index].y);
        close(wrapped[index].z, first[index].z);
        close(wrapped[index].radius, first[index].radius);
        close(wrapped[index].opacity, first[index].opacity);
    }
});

test('depth uses true camera projection: near discs are larger, rise faster and parallax farther', () => {
    const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 200);
    camera.position.set(0, 2.6, -20);
    camera.lookAt(0, 2.5, -9);
    camera.updateMatrixWorld();
    const project = (point) => new Vector3(...point).project(camera);
    const apparentRadius = (z) => Math.abs(project([0.2, 2.6, z]).x - project([0, 2.6, z]).x);
    const apparentRise = (z) => Math.abs(project([0, 2.7, z]).y - project([0, 2.6, z]).y);
    assert.ok(apparentRadius(-16) > apparentRadius(-7) * 3);
    assert.ok(apparentRise(-16) > apparentRise(-7) * 3);
    const nearBefore = project([0, 2.6, -16]).x;
    const farBefore = project([0, 2.6, -7]).x;
    camera.position.x += 1;
    camera.lookAt(1, 2.5, -9);
    camera.updateMatrixWorld();
    assert.ok(Math.abs(project([0, 2.6, -16]).x - nearBefore)
        > Math.abs(project([0, 2.6, -7]).x - farBefore) * 3);
});

test('a narrow phone frustum contains multiple visible depths rather than only one or two flat dots', () => {
    const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 200);
    camera.position.set(56, 2.6, -20);
    camera.lookAt(56, 2.5, -9);
    camera.updateMatrixWorld();
    const field = fieldAt();
    const point = new Vector3();
    const view = new Vector3();
    let elapsed = 0;
    for (const time of [0, 10, 20, 40, 60]) {
        while (elapsed < time - 0.00001) {
            advanceWorldDustField(field, camera.position, 0.05);
            elapsed += 0.05;
        }
        const visible = [];
        for (let index = 0; index < WORLD_DUST_COUNT; index++) {
            const mote = sampleWorldDustFrame(field, index, time);
            point.set(mote.x, mote.y, mote.z);
            const alpha = mote.opacity * worldDustDistanceOpacity(point.distanceTo(camera.position));
            view.copy(point).applyMatrix4(camera.matrixWorldInverse);
            point.project(camera);
            if (view.z < 0 && Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && alpha > 0.01) visible.push(-view.z);
        }
        // Faster integrated foreground flow changes the sparse composition;
        // retain several depths, not a fixed count at an old phase schedule.
        assert.ok(visible.length >= 4 && visible.length <= 24, `${visible.length} visible at ${time}s`);
        assert.ok(Math.max(...visible) - Math.min(...visible) > 4);
    }
});

test('rise resets invisibly at fixed world cell boundaries, does not sink below the floor, and rises slowly', () => {
    const field = fieldAt();
    let rising = 0;
    for (let index = 0; index < WORLD_DUST_COUNT; index++) {
        const m = index * 4;
        const loopTime = (WORLD_DUST_CELL_SIZE - field.motion[m]) / field.motion[m + 1];
        const before = sampleWorldDust(field, index, loopTime - 0.00001);
        const after = sampleWorldDust(field, index, loopTime + 0.00001);
        assert.ok(before.opacity < 0.000001 && after.opacity < 0.000001);
        const now = sampleWorldDust(field, index, 0);
        const later = sampleWorldDust(field, index, 0.1);
        if (later.y > now.y) {
            assert.ok(later.y - now.y >= 0.0044 && later.y - now.y <= 0.0101);
            rising++;
        }
        if (now.y < 0.08) assert.equal(now.opacity, 0);
    }
    assert.ok(rising > WORLD_DUST_COUNT * 0.99);
});
