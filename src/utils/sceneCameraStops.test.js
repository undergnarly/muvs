import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleSceneCameraStops } from './sceneCameraStops.js';

const frozenStops = values => Object.freeze(values.map(stop => Object.freeze({
    pos: Object.freeze({ ...stop.pos }), look: Object.freeze({ ...stop.look }), fov: stop.fov,
})));
const closePose = (actual, expected) => {
    for (const vector of ['pos', 'look']) for (const axis of ['x', 'y', 'z']) {
        assert.ok(Math.abs(actual[vector][axis] - expected[vector][axis]) < 1e-12);
    }
    assert.ok(Math.abs(actual.fov - expected.fov) < 1e-12);
};

const stops = frozenStops([
    { pos: { x: 0, y: 2, z: 8 }, look: { x: -2, y: 3, z: 0 }, fov: 40 },
    { pos: { x: 4, y: 10, z: 24 }, look: { x: 2, y: -1, z: 8 }, fov: 80 },
    { pos: { x: -7.6, y: 8.8, z: 30 }, look: { x: -0.7, y: 1.6, z: 19.6 }, fov: 26 },
    { pos: { x: 2.7, y: 15.4, z: 30 }, look: { x: -5.3, y: 0.1, z: 11.4 }, fov: 27 },
]);

test('Radio single-stop sampling clones both frozen vectors for every progress and independent camera mutation', () => {
    const single = frozenStops([stops[0]]);
    for (const progress of [-Infinity, -1, 0, 0.25, 0.5, 0.75, 1, 2, Infinity, NaN]) {
        const pose = sampleSceneCameraStops(single, progress);
        assert.deepEqual(pose, single[0]);
        assert.notEqual(pose, single[0]);
        assert.notEqual(pose.pos, single[0].pos);
        assert.notEqual(pose.look, single[0].look);
        pose.pos.x += 70;
        pose.pos.y += 4;
        pose.look.z -= 2;
        assert.deepEqual(single[0], stops[0]);
        assert.deepEqual(sampleSceneCameraStops(single, progress), stops[0]);
    }
});

test('two-stop fractions preserve the existing exact smoothstep curve and FOV interpolation', () => {
    const pair = stops.slice(0, 2);
    assert.deepEqual(sampleSceneCameraStops(pair, 0.25), {
        pos: { x: 0.625, y: 3.25, z: 10.5 }, look: { x: -1.375, y: 2.375, z: 1.25 }, fov: 46.25,
    });
    assert.deepEqual(sampleSceneCameraStops(pair, 0.5), {
        pos: { x: 2, y: 6, z: 16 }, look: { x: 0, y: 1, z: 4 }, fov: 60,
    });
    assert.deepEqual(sampleSceneCameraStops(pair, 0.75), {
        pos: { x: 3.375, y: 8.75, z: 21.5 }, look: { x: 1.375, y: -0.375, z: 6.75 }, fov: 73.75,
    });
});

test('multi-stop endpoints and segment joins preserve frozen presets and return detached vectors', () => {
    for (const length of [2, 3, 4]) {
        const section = stops.slice(0, length);
        for (let index = 0; index < length; index++) {
            const pose = sampleSceneCameraStops(section, index / (length - 1));
            closePose(pose, section[index]);
            assert.notEqual(pose.pos, section[index].pos);
            assert.notEqual(pose.look, section[index].look);
            pose.pos.x += 7;
            pose.look.y += 2;
            closePose(sampleSceneCameraStops(section, index / (length - 1)), section[index]);
        }
        for (const progress of [-Infinity, -0.7, -0.001]) closePose(sampleSceneCameraStops(section, progress), section[0]);
        for (const progress of [1.001, 1.7, Infinity]) closePose(sampleSceneCameraStops(section, progress), section.at(-1));
    }
});

test('all existing multi-stop fractional sampling is byte-for-number identical to the prior algorithm', () => {
    const legacy = (section, progress) => {
        const count = section.length - 1;
        const value = Math.max(0, Math.min(1, progress)) * count;
        const index = Math.min(Math.floor(value), count - 1);
        const local = value - index;
        const ease = local * local * (3 - 2 * local);
        const interpolate = (a, b) => a + (b - a) * ease;
        const vector = (a, b) => ({ x: interpolate(a.x, b.x), y: interpolate(a.y, b.y), z: interpolate(a.z, b.z) });
        return { pos: vector(section[index].pos, section[index + 1].pos),
            look: vector(section[index].look, section[index + 1].look),
            fov: interpolate(section[index].fov, section[index + 1].fov) };
    };
    for (const length of [2, 3, 4]) for (let step = -10; step <= 110; step++) {
        const section = stops.slice(0, length);
        assert.deepEqual(sampleSceneCameraStops(section, step / 100), legacy(section, step / 100));
    }
});

test('flat and hub cameras use the extracted safe sampler instead of a divergent local implementation', () => {
    const scene = readFileSync(new URL('../components/pages/HomeNewPage.jsx', import.meta.url), 'utf8');
    assert.match(scene, /import \{ sampleSceneCameraStops as sampleStops \} from '\.\.\/\.\.\/utils\/sceneCameraStops'/);
    assert.equal((scene.match(/sampleStops\(/g) || []).length, 2);
    assert.doesNotMatch(scene, /const sampleStops\s*=/);
});
