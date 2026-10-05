import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMenuZoom, applyInitialMenuDolly } from './initialMenuZoom.js';
const frame = { delta: 0.05, ready: true, visible: true, skip: false, menu: true, index: 4 };

test('initial elevated approach holds behind splash, then settles in 1.25 seconds', () => {
    const zoom = createInitialMenuZoom({ enabled: true, initialIndex: 4 });
    assert.equal(zoom.sample({ ...frame, ready: false }), 1.2);
    let previous = 1.2;
    for (let i = 0; i < 25; i++) {
        const next = zoom.sample(frame);
        assert.ok(next <= previous && next >= 1);
        previous = next;
    }
    assert.equal(previous, 1);
    assert.equal(zoom.sample(frame), 1);
});

test('dolly starts closer and above the target while preserving tuned final pose', () => {
    const look = { x: 56, y: 2.5, z: -9 };
    for (const depth of [9.5, 11]) {
        const position = { x: 56, y: 2.6, z: -9 - depth };
        applyInitialMenuDolly(position, look, 1.2);
        assert.equal(position.x, 56);
        assert.ok(Math.abs((position.z - look.z) - (-depth / 1.2)) < 1e-10);
        assert.ok(position.y > 2.6 && position.y < 3.2);
        const rest = { x: 56, y: 2.6, z: -9 - depth };
        applyInitialMenuDolly(rest, look, 1);
        assert.deepEqual(rest, { x: 56, y: 2.6, z: -9 - depth });
        assert.deepEqual(look, { x: 56, y: 2.5, z: -9 });
    }
});
test('hidden time freezes; a fresh selection or reduced motion cancels forever', () => {
    for (const override of [{ skip: true }, { menu: false }, { index: 5 }]) {
        const zoom = createInitialMenuZoom({ enabled: true, initialIndex: 4 });
        assert.equal(zoom.sample({ ...frame, visible: false }), 1.2);
        assert.equal(zoom.sample({ ...frame, ...override }), 1);
        assert.equal(zoom.sample(frame), 1);
    }
    assert.equal(createInitialMenuZoom({ enabled: false, initialIndex: 4 }).sample(frame), 1);
});
