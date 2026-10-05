import test from 'node:test';
import assert from 'node:assert/strict';
import { applyStartupDivePose } from './startupDivePose.js';

const poses = [
    { position: { x: 56, y: 2.6, z: -20 }, look: { x: 56, y: 2.5, z: -9 } },
    { position: { x: -14, y: 3, z: 7 }, look: { x: -14, y: 2.6, z: 0 } },
    { position: { x: -7.6, y: 8.8, z: 30 }, look: { x: -0.7, y: 1.6, z: 19.6 } },
];

test('startup dive begins above and twenty percent closer for either camera depth sign', () => {
    for (const pose of poses) {
        const position = { ...pose.position };
        const look = { ...pose.look };
        const distance = Math.hypot(position.x - look.x, position.z - look.z);
        assert.equal(applyStartupDivePose(position, look, 0), position);
        assert.ok(Math.abs(position.x - (look.x + (pose.position.x - look.x) / 1.2)) < 1e-10);
        assert.ok(Math.abs(position.z - (look.z + (pose.position.z - look.z) / 1.2)) < 1e-10);
        assert.ok(Math.abs(position.y - (pose.position.y + distance * 0.2)) < 1e-10);
        assert.deepEqual(look, pose.look);
    }
});

test('shared eased progress descends and pulls out monotonically without overshooting tuned stops', () => {
    for (const pose of poses) {
        let lastY = Infinity;
        let lastDistance = 0;
        for (let step = 0; step <= 100; step++) {
            const position = { ...pose.position };
            applyStartupDivePose(position, pose.look, step / 100);
            const distance = Math.hypot(position.x - pose.look.x, position.z - pose.look.z);
            assert.ok(position.y <= lastY && position.y >= pose.position.y);
            assert.ok(distance >= lastDistance);
            lastY = position.y;
            lastDistance = distance;
        }
        const position = { ...pose.position };
        applyStartupDivePose(position, pose.look, 1);
        assert.deepEqual(position, pose.position);
    }
});

test('completed, clamped and invalid progress preserve finite positions and unchanged target', () => {
    for (const progress of [1, 2, Infinity, -Infinity, NaN, undefined]) {
        const position = { ...poses[0].position };
        applyStartupDivePose(position, poses[0].look, progress);
        assert.deepEqual(position, poses[0].position);
    }
    const below = { ...poses[0].position };
    const initial = { ...poses[0].position };
    applyStartupDivePose(below, poses[0].look, -1);
    applyStartupDivePose(initial, poses[0].look, 0);
    assert.deepEqual(below, initial);
    const coincident = { x: 0, y: 3, z: 0 };
    applyStartupDivePose(coincident, { x: 0, y: 2, z: 0 }, 0);
    assert.deepEqual(coincident, { x: 0, y: 3, z: 0 });
});
