import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { createCenteredCameraFrame, sampleCenteredHubFrame, sampleCenteredFlatFrame, captureHubTravelLane, hubCameraLane, rebaseHiddenHubLane } from './centeredSectionCamera.js';

const poses = [
    { pos: { x: 0, y: 3, z: 7 }, look: { x: 0, y: 2.6, z: 0 }, fov: 46 },
    { pos: { x: 0, y: 5.2, z: 10.3 }, look: { x: 0, y: -.2, z: 9.7 }, fov: 113 },
    { pos: { x: -7.6, y: 8.8, z: 30 }, look: { x: -.7, y: 1.6, z: 19.6 }, fov: 26 },
    { pos: { x: 2.7, y: 15.4, z: 30 }, look: { x: -5.3, y: .1, z: 11.4 }, fov: 27 },
    { pos: { x: 0, y: 3, z: 7 }, look: { x: 0, y: 2.6, z: -10.7 }, fov: 56 },
];
const offsets = [0, .37, 7, 14, 56, 140];
const origins = [56, 70, 84, 98];
const localPoints = [{ x: 0, y: 2.5, z: 0 }, { x: 14, y: .025, z: 8 }, { x: 56, y: 4, z: 17 }];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} differs from ${b}`);
const cameraFor = ({ pos, look, fov }) => {
    const camera = new PerspectiveCamera(fov, 390 / 844, .1, 2000);
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(look.x, look.y, look.z);
    camera.updateMatrixWorld();
    return camera;
};

test('hub carousel moves its root, not camera/target, for first, fractional and final selections', () => {
    const frame = createCenteredCameraFrame();
    for (const x of origins) for (const offset of offsets) {
        assert.equal(sampleCenteredHubFrame(frame, poses[0], x, 56, offset), frame);
        assert.equal(frame.originX, x + offset);
        assert.equal(frame.pose.pos.x, x);
        assert.equal(frame.pose.look.x, x);
        assert.equal(frame.pose.pos.z, -63);
        assert.equal(frame.pose.look.z, -56);
        near(frame.pose.look.y, 2.82);
        assert.equal(frame.pose.fov, 46);
    }
});

test('hub root compensation preserves the exact authored section projection and camera orientation', () => {
    const frame = createCenteredCameraFrame();
    for (const local of poses) for (const x of origins) for (const offset of offsets) {
        sampleCenteredHubFrame(frame, local, x, 56, offset);
        const oldCamera = cameraFor({
            pos: { x: x - local.pos.x - offset, y: local.pos.y, z: -local.pos.z - 56 },
            look: { x: x - local.look.x - offset, y: local.look.y + .22, z: -local.look.z - 56 },
            fov: local.fov,
        });
        const nextCamera = cameraFor(frame.pose);
        for (const point of localPoints) {
            const oldView = new Vector3(x - point.x, point.y, -point.z - 56).applyMatrix4(oldCamera.matrixWorldInverse);
            const nextView = new Vector3(frame.originX - point.x, point.y, -point.z - 56).applyMatrix4(nextCamera.matrixWorldInverse);
            near(nextView.x, oldView.x); near(nextView.y, oldView.y); near(nextView.z, oldView.z);
        }
        near(Math.abs(nextCamera.quaternion.dot(oldCamera.quaternion)), 1);
    }
});

test('all authored floor poses, entry, return and same-item reentry retain one center lane at every travel sample', () => {
    const frame = createCenteredCameraFrame();
    for (const pose of poses) for (const x of origins) for (const offset of offsets) {
        const section = sampleCenteredHubFrame(frame, pose, x, 56, offset).pose;
        for (let step = 0; step <= 100; step++) {
            const t = step / 100;
            const smooth = t * t * (3 - 2 * t);
            const eased = smooth * smooth * (3 - 2 * smooth);
            near(x + (section.pos.x - x) * eased, x);
            near(section.pos.x + (x - section.pos.x) * eased, x);
            near(x + (section.look.x - x) * eased, x - (pose.look.x - pose.pos.x) * eased);
            near(frame.originX - offset - pose.pos.x, x);
        }
    }
});

test('56-unit menu wrapping translates both section and camera equally without changing the framing', () => {
    const before = createCenteredCameraFrame();
    const after = createCenteredCameraFrame();
    for (const local of poses) for (const offset of offsets) for (const shift of [-56, 56]) {
        sampleCenteredHubFrame(before, local, 98, 56, offset);
        sampleCenteredHubFrame(after, local, 98 + shift, 56, offset);
        near(after.originX - before.originX, shift);
        near(after.pose.pos.x - before.pose.pos.x, shift);
        near(after.pose.look.x - before.pose.look.x, shift);
        near(after.originX - after.pose.pos.x, before.originX - before.pose.pos.x);
        near(after.originX - after.pose.look.x, before.originX - before.pose.look.x);
    }
});

test('standalone sections keep their original view while selected content slides beneath the centered camera', () => {
    const frame = createCenteredCameraFrame();
    for (const local of poses) for (const offset of offsets) {
        assert.equal(sampleCenteredFlatFrame(frame, local, offset), frame);
        near(frame.originX, -offset - local.pos.x);
        assert.deepEqual(frame.pose, {
            pos: { ...local.pos, x: 0 },
            look: { ...local.look, x: local.look.x - local.pos.x },
            fov: local.fov,
        });
        const oldCamera = cameraFor({
            pos: { ...local.pos, x: local.pos.x + offset },
            look: { ...local.look, x: local.look.x + offset },
            fov: local.fov,
        });
        const nextCamera = cameraFor(frame.pose);
        for (const point of localPoints) {
            const oldView = new Vector3(point.x, point.y, point.z).applyMatrix4(oldCamera.matrixWorldInverse);
            const nextView = new Vector3(point.x + frame.originX, point.y, point.z).applyMatrix4(nextCamera.matrixWorldInverse);
            near(nextView.x, oldView.x); near(nextView.y, oldView.y); near(nextView.z, oldView.z);
        }
    }
});

test('sampling reuses its output without mutating authored poses or retaining old frame coordinates', () => {
    const frame = createCenteredCameraFrame();
    const pose = Object.freeze({ pos: Object.freeze({ ...poses[2].pos }), look: Object.freeze({ ...poses[2].look }), fov: poses[2].fov });
    const before = JSON.stringify(pose);
    const outputPose = frame.pose;
    sampleCenteredHubFrame(frame, pose, 84, 56, 14);
    sampleCenteredFlatFrame(frame, poses[0], 0);
    assert.equal(frame.pose, outputPose);
    assert.deepEqual(frame.pose, poses[0]);
    assert.equal(JSON.stringify(pose), before);
    assert.equal(frame.originX, 0);
});

test('rapid horizontal menu movement freezes its current lane through entry and only rebases an invisible ring', () => {
    const frame = createCenteredCameraFrame();
    for (const current of [56.3, 61.75, 69.9]) {
        const state = { phase: 'menu', angle: current, menuIndex: 5, menuOffset: -2.25, tt: 0 };
        const anchor = captureHubTravelLane(state);
        state.phase = 'travel';
        for (let i = 0; i <= 100; i++) {
            state.tt = i / 100;
            const hidden = state.tt > .55;
            const previousAngle = state.angle;
            const previousOffset = state.menuOffset;
            assert.equal(rebaseHiddenHubLane(state, 14), hidden);
            if (!hidden) {
                assert.equal(state.angle, previousAngle);
                assert.equal(state.menuOffset, previousOffset);
            }
            near(hubCameraLane(state), anchor);
            sampleCenteredHubFrame(frame, poses[i % poses.length], hubCameraLane(state), 56, 14 * .92 ** i);
            near(frame.pose.pos.x, anchor);
        }
        state.phase = 'section';
        near(captureHubTravelLane(state), anchor);
        state.phase = 'travel';
        for (let i = 100; i >= 0; i--) {
            state.tt = i / 100;
            rebaseHiddenHubLane(state, 14);
            near(hubCameraLane(state), anchor);
        }
        state.phase = 'menu';
        near(state.menuIndex * 14 + state.menuOffset, anchor);
        near(hubCameraLane(state), anchor);
        for (const wrap of [-56, 56]) {
            state.angle += wrap;
            state.menuIndex += wrap / 14;
            near(hubCameraLane(state), anchor + wrap);
            near(state.menuIndex * 14 + state.menuOffset, anchor + wrap);
            state.angle -= wrap;
            state.menuIndex -= wrap / 14;
        }
    }
});

test('direct section and foreign-return routes keep their initialized lane without a prior menu interaction', () => {
    for (const phase of ['section', 'foreign']) for (const x of origins) {
        const state = { phase, angle: x, menuIndex: x / 14, tt: 1 };
        near(hubCameraLane(state), x);
        near(captureHubTravelLane(state), x);
        rebaseHiddenHubLane(state, 14);
        near(hubCameraLane(state), x);
    }
});
