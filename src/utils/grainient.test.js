import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    GRAINIENT_SETTINGS, GRAINIENT_FPS, GRAINIENT_GRAIN_SCALE,
    GRAINIENT_VERTEX_SHADER, GRAINIENT_FIELD_FRAGMENT_SHADER,
    GRAINIENT_COMPOSITE_FRAGMENT_SHADER, createGrainientRamp,
    grainientFieldSize, grainientFrame, sampleGrainientField, GRAINIENT_FALLBACK,
} from './grainient.js';

test('Grainient preset preserves the supplied five-color settings', () => {
    assert.deepEqual(GRAINIENT_SETTINGS, {
        colors: ['#454545', '#bfbfbf', '#e3e3e3', '#e0e0e0', '#ffffff'],
        angle: 179, flow: 0, silk: 1, grainAmount: 0.04, scale: 0.8,
        speed: 0.5, grainSize: 0.5, contrast: 1.29, saturation: 0.18, interactive: false,
    });
    assert.ok(Object.isFrozen(GRAINIENT_SETTINGS.colors));
    const ramp = createGrainientRamp();
    assert.ok(ramp instanceof Float32Array);
    assert.equal(ramp.length, 15);
    [0.39042084, 0.80465802, 0.91583147, 0.90670069, 1].forEach((L, index) => {
        assert.ok(Math.abs(ramp[index * 3] - L) < 0.000001);
        assert.ok(Math.abs(ramp[index * 3 + 1]) < 0.000001);
        assert.ok(Math.abs(ramp[index * 3 + 2]) < 0.000001);
    });
    ramp[0] = 42;
    assert.notEqual(createGrainientRamp()[0], 42, 'renderers never share mutable uniforms');
});

test('Grainient caches the original half-resolution field for each drawing buffer', () => {
    assert.deepEqual(grainientFieldSize(780, 1688), { width: 390, height: 844 });
    assert.deepEqual(grainientFieldSize(1441, 901), { width: 721, height: 451 });
    assert.deepEqual(grainientFieldSize(1, 1), { width: 1, height: 1 });
    assert.deepEqual(grainientFieldSize(NaN, -200), { width: 1, height: 1 });
});

test('Grainient grain changes four times slower at 6Hz and wraps the same 97 original seeds', () => {
    assert.equal(GRAINIENT_FPS, 6);
    assert.equal(grainientFrame(0), 0);
    for (const seconds of [1 / 24, 2 / 24, 3 / 24, 1 / 6 - 0.000001]) {
        assert.equal(grainientFrame(seconds), 0, `seed holds until 1/6 second, including ${seconds}`);
    }
    assert.equal(grainientFrame(1 / 6), 1);
    assert.equal(grainientFrame(2 / 6 - 0.000001), 1);
    assert.equal(grainientFrame(2 / 6), 2);
    assert.equal(grainientFrame(96 / 6), 96);
    assert.equal(grainientFrame(97 / 6), 0);
    assert.equal(grainientFrame(98 / 6), 1);
    assert.equal(grainientFrame(-1), 0);
    assert.equal(grainientFrame(Infinity), 0);
    assert.equal(grainientFrame(NaN), 0);
});

test('standalone grain timer shares the same cadence instead of retaining a separate 24Hz loop', () => {
    const source = readFileSync(new URL('../components/layout/GrainientBackground.jsx', import.meta.url), 'utf8');
    assert.match(source, /1000 \/ GRAINIENT_FPS/);
    assert.doesNotMatch(source, /1000\s*\/\s*24\b/);
});

test('grain pitch doubles in both renderers without increasing its original amplitude', () => {
    assert.equal(GRAINIENT_GRAIN_SCALE, 2);
    assert.equal(GRAINIENT_SETTINGS.grainAmount, 0.04);
    assert.equal(GRAINIENT_SETTINGS.grainSize, 0.5, 'supplied preset remains intact as provenance');
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /floor\(gl_FragCoord\.xy \/ 2\.0\) \+ 0\.5/);
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /uFrame \* vec2\(17\.0, 59\.0\)/);
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /hash\(pixel\) \+ hash\(pixel \+ 7\.13\) - 1\.0/);
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /grain \* uGrainAmount \*/);
});

test('Grainient settled mobile samples retain silk, Oklab and the longer gray floor', () => {
    const aspect = 390 / 844;
    for (const [y, expected] of [[0, 57], [0.1, 105], [0.2, 173], [0.4, 204], [0.5, 217], [0.7, 217], [0.8, 225], [1, 255]]) {
        const channels = sampleGrainientField({ y, aspect }).map((value) => Math.round(value * 255));
        assert.deepEqual(channels, [expected, expected, expected], `center sample at ${y}`);
    }
    assert.ok(sampleGrainientField({ y: 0.64, aspect })[0] < 0.9, 'not the old white-at-64% CSS gradient');
    const left = sampleGrainientField({ x: 0, y: 0.2, aspect })[0];
    const right = sampleGrainientField({ x: 1, y: 0.2, aspect })[0];
    assert.notEqual(left, right, '179-degree direction remains slightly tilted');
});

test('Grainient floor fade mixes to white before the common grain composite', () => {
    const full = sampleGrainientField({ y: 0.1 });
    assert.deepEqual(sampleGrainientField({ y: 0.1, fieldOpacity: 0 }), [1, 1, 1]);
    const half = sampleGrainientField({ y: 0.1, fieldOpacity: 0.5 });
    full.forEach((value, index) => assert.ok(Math.abs(half[index] - (value + 1) / 2) < 1e-12));
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /mix\(vec3\(1\.0\), texture\(uField/);
    assert.match(GRAINIENT_COMPOSITE_FRAGMENT_SHADER, /color \+= grain \* uGrainAmount/);
});

test('Grainient shader contract shares one triangle, cached field and encoded output', () => {
    for (const source of [GRAINIENT_VERTEX_SHADER, GRAINIENT_FIELD_FRAGMENT_SHADER, GRAINIENT_COMPOSITE_FRAGMENT_SHADER]) {
        assert.doesNotMatch(source, /#version/);
        assert.doesNotMatch(source, /colorspace_fragment|tonemapping_fragment/);
    }
    assert.match(GRAINIENT_VERTEX_SHADER, /gl_VertexID/);
    assert.match(GRAINIENT_FIELD_FRAGMENT_SHADER, /uniform vec3 uRamp\[5\]/);
    assert.match(GRAINIENT_FIELD_FRAGMENT_SHADER, /fwidth\(scaled\)/);
    assert.doesNotMatch(GRAINIENT_FIELD_FRAGMENT_SHADER, /uTime|uStir|uTwirl|drift\(/);
});

test('opaque priority splash and both route fallbacks share the new settled palette', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    assert.equal(html.split(GRAINIENT_FALLBACK).length - 1, 2, 'outer splash and moving opaque plane match');
    for (const path of ['../components/pages/HomeNewPage.css', '../components/pages/DubplatesPage.css']) {
        const css = readFileSync(new URL(path, import.meta.url), 'utf8');
        assert.ok(css.includes(GRAINIENT_FALLBACK), `${path} matches the loader/library fallback`);
    }
});
