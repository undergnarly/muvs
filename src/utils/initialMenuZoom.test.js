import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialMenuZoom } from './initialMenuZoom.js';
const frame = { delta: 0.05, ready: true, visible: true, skip: false, menu: true, index: 4 };

test('initial scene stays20% closer behind splash, then settles exactly in one second', () => {
    const zoom = createInitialMenuZoom({ enabled: true, initialIndex: 4 });
    assert.equal(zoom.sample({ ...frame, ready: false }), 1.2);
    let previous = 1.2;
    for (let i = 0; i < 20; i++) {
        const next = zoom.sample(frame);
        assert.ok(next <= previous && next >= 1);
        previous = next;
    }
    assert.equal(previous, 1);
    assert.equal(zoom.sample(frame), 1);
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
