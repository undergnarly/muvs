import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { createHandheldCamera } from './handheldCamera.js';

function makeShot(width = 390, height = 844, position = [0, 1, 10], target = [0, 1, 0]) {
    const camera = new PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(...position);
    const focus = new Vector3(...target);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
    return { camera, focus, width, height, position: camera.position.clone(), quaternion: camera.quaternion.clone() };
}

function resetPose(shot) {
    shot.camera.position.copy(shot.position);
    shot.camera.quaternion.copy(shot.quaternion);
}

function advance(shot, handheld, seconds, fps = 60) {
    const frames = Math.round(seconds * fps);
    for (let i = 0; i < frames; i++) {
        resetPose(shot);
        handheld.apply(shot.camera, 1 / fps, true, shot.position.distanceTo(shot.focus), shot.height);
    }
    shot.camera.updateMatrixWorld();
}

function poseDistance(a, b) {
    const qa = a.camera.quaternion;
    const qb = b.camera.quaternion;
    const sign = qa.dot(qb) < 0 ? -1 : 1;
    const rotationDistance = Math.hypot(qa.x - sign * qb.x, qa.y - sign * qb.y, qa.z - sign * qb.z, qa.w - sign * qb.w);
    return a.camera.position.distanceTo(b.camera.position) + rotationDistance;
}

function pointPx(shot, worldPoint) {
    shot.camera.updateMatrixWorld();
    const point = worldPoint.clone().project(shot.camera);
    return { x: point.x * shot.width / 2, y: point.y * shot.height / 2 };
}

test('handheld is deterministic, keeps breathing at rest, and preserves camera settings', () => {
    const a = makeShot();
    const b = makeShot();
    a.camera.zoom = b.camera.zoom = 1.2;
    const first = createHandheldCamera();
    const second = createHandheldCamera();
    advance(a, first, 3);
    advance(b, second, 3);
    assert.ok(poseDistance(a, b) < 1e-10);
    const previousPosition = a.camera.position.clone();
    const previousQuaternion = a.camera.quaternion.clone();
    advance(a, first, 1);
    assert.ok(a.camera.position.distanceTo(previousPosition) > 0.00001);
    assert.ok(a.camera.quaternion.angleTo(previousQuaternion) > 0.00001);
    assert.equal(a.camera.fov, 50);
    assert.equal(a.camera.zoom, 1.2);
    assert.equal(a.camera.near, 0.1);
    assert.equal(a.camera.far, 2000);
});

test('visible elapsed time gives equivalent poses at 30, 60 and 120 fps', () => {
    const shots = [30, 60, 120].map((fps) => {
        const shot = makeShot();
        advance(shot, createHandheldCamera(), 12, fps);
        return shot;
    });
    assert.ok(poseDistance(shots[0], shots[1]) < 1e-8);
    assert.ok(poseDistance(shots[1], shots[2]) < 1e-8);
});

test('a static camera can be reused without accumulating translation or rotation', () => {
    const a = makeShot();
    const b = makeShot();
    const first = createHandheldCamera();
    const second = createHandheldCamera();
    for (let i = 0; i < 1800; i++) {
        first.apply(a.camera, 1 / 60, true, 10, a.height);
        resetPose(b);
        second.apply(b.camera, 1 / 60, true, 10, b.height);
    }
    assert.ok(poseDistance(a, b) < 1e-8);
    first.apply(a.camera, 0, false, 10, a.height);
    assert.ok(a.camera.position.distanceTo(a.position) < 1e-12);
    assert.ok(a.camera.quaternion.angleTo(a.quaternion) < 1e-8);
});

test('paused/loading/reduced motion does not advance the phase and resumes gently', () => {
    const paused = makeShot();
    const control = makeShot();
    const first = createHandheldCamera();
    const second = createHandheldCamera();
    advance(paused, first, 5);
    advance(control, second, 5);
    for (let i = 0; i < 120; i++) first.apply(paused.camera, 100, false, 10, paused.height);
    second.apply(control.camera, 0, false, 10, control.height);
    assert.ok(paused.camera.position.distanceTo(paused.position) < 1e-12);
    advance(paused, first, 1 / 60);
    advance(control, second, 1 / 60);
    assert.ok(poseDistance(paused, control) < 1e-8);
    const pixel = pointPx(paused, paused.focus);
    assert.ok(Math.hypot(pixel.x, pixel.y) < 0.01, 'the first resumed frame must not jump to full amplitude');
});

test('large hidden-frame gaps and invalid deltas cannot jump the clock or poison the pose', () => {
    const shot = makeShot();
    const handheld = createHandheldCamera();
    advance(shot, handheld, 4);
    for (const delta of [300, Number.NaN, Number.POSITIVE_INFINITY, -1, 0]) {
        resetPose(shot);
        handheld.apply(shot.camera, delta, true, Number.NaN, Number.NaN);
        assert.ok(shot.camera.position.toArray().every(Number.isFinite));
        assert.ok(shot.camera.quaternion.toArray().every(Number.isFinite));
    }
    resetPose(shot);
    handheld.apply(shot.camera, 1 / 60, true, 10, shot.height);
    const pixel = pointPx(shot, shot.focus);
    assert.ok(Math.hypot(pixel.x, pixel.y) < 0.01);
});

test('CSS-pixel amplitude stays subtle on portrait, desktop, rear-facing and floor views', () => {
    for (const [width, height] of [[390, 844], [1440, 900]]) {
        for (const [position, target] of [
            [[0, 1, 10], [0, 1, 0]],
            [[12, 3, -24], [12, 3, -8]],
            [[4, 12, 1], [4, 0, 0]],
        ]) {
            const shot = makeShot(width, height, position, target);
            const handheld = createHandheldCamera();
            const center = pointPx(shot, shot.focus);
            let maxShift = 0;
            let maxFrameShift = 0;
            let previous = center;
            for (let i = 0; i < 60 * 25; i++) {
                resetPose(shot);
                handheld.apply(shot.camera, 1 / 60, true, shot.position.distanceTo(shot.focus), height);
                const pixel = pointPx(shot, shot.focus);
                maxShift = Math.max(maxShift, Math.hypot(pixel.x - center.x, pixel.y - center.y));
                maxFrameShift = Math.max(maxFrameShift, Math.hypot(pixel.x - previous.x, pixel.y - previous.y));
                previous = pixel;
            }
            assert.ok(maxShift > 0.2, `${width}×${height}: idle movement must remain present`);
            assert.ok(maxShift < 1.2, `${width}×${height}: ${maxShift} CSS px is too large`);
            assert.ok(maxFrameShift < 0.055, `${width}×${height}: ${maxFrameShift} CSS px/frame is too abrupt`);
        }
    }
});

test('focus distance, FOV and zoom do not magnify screen-space movement', () => {
    const samples = [];
    for (const [distance, fov, zoom] of [[2, 25, 2], [10, 50, 1], [250, 90, 0.75]]) {
        const shot = makeShot(390, 844, [0, 1, distance]);
        shot.camera.fov = fov;
        shot.camera.zoom = zoom;
        shot.camera.updateProjectionMatrix();
        advance(shot, createHandheldCamera(), 7);
        samples.push(pointPx(shot, shot.focus));
    }
    for (const pixel of samples) {
        assert.ok(Math.hypot(pixel.x - samples[0].x, pixel.y - samples[0].y) < 0.00001);
    }
});

test('phase wrapping is continuous and reset returns the deterministic opening motion', () => {
    const shot = makeShot();
    const fresh = makeShot();
    const handheld = createHandheldCamera();
    advance(shot, handheld, 99.99, 100);
    const previous = pointPx(shot, shot.focus);
    advance(shot, handheld, 0.02, 100);
    const next = pointPx(shot, shot.focus);
    assert.ok(Math.hypot(next.x - previous.x, next.y - previous.y) < 0.06);
    handheld.reset();
    advance(shot, handheld, 1);
    advance(fresh, createHandheldCamera(), 1);
    assert.ok(poseDistance(shot, fresh) < 1e-8);
});
