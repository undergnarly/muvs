'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { srgbToLinear, linearToSrgb, lightWave, glintWave, spatialWeight, prepareFields, renderFrame, roiExtremes, roiColorDelta, PRESETS } = require('./prepare-object-relighting.cjs');

test('sRGB transfer round trips and does not use gamma-space addition', () => {
  for (const value of [0, 0.01, 0.04, 0.18, 0.5, 0.9, 1]) assert.ok(Math.abs(linearToSrgb(srgbToLinear(value)) - value) < 1e-10);
  assert.ok(Math.abs(srgbToLinear(0.5) - 0.21404) < 0.00001);
});

test('slow periodic envelope is exact at both boundaries without flashes', () => {
  for (const phase of [0, -0.8, 0.42, 1.1]) {
    assert.equal(lightWave(0, 144, phase), lightWave(143, 144, phase));
    for (let frame = 1; frame < 144; frame += 1) {
      assert.ok(Math.abs(lightWave(frame, 144, phase) - lightWave(frame - 1, 144, phase)) < 0.045);
      assert.ok(lightWave(frame, 144, phase) >= 0 && lightWave(frame, 144, phase) <= 1);
    }
  }
});

test('geometry-specific code light reaches the face and hand but not legs or chair', () => {
  const strength = (x, y) => PRESETS.code.regions.reduce((sum, area) => sum + spatialWeight(x, y, area) * area.strength, 0);
  assert.ok(strength(0.492, 0.154) > 0.25);
  assert.ok(strength(0.494, 0.417) > 0.15);
  assert.equal(strength(0.63, 0.84), 0);
  assert.equal(strength(0.23, 0.72), 0);
  assert.equal(strength(0.9, 0.1), 0);
});

test('rendering preserves alpha, untouched pixels, shadow edges and channel limits', () => {
  const size = 40;
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) { rgba[i * 4] = 90; rgba[i * 4 + 1] = 100; rgba[i * 4 + 2] = 110; rgba[i * 4 + 3] = 255; }
  const partial = 6 * size + 19;
  rgba[partial * 4 + 3] = 120;
  const fields = prepareFields(rgba, Buffer.alloc(size * size, 100), Buffer.alloc(size * size, 95), size, PRESETS.code);
  const frame = renderFrame(fields, 36);
  assert.equal(fields.alpha[partial], 120);
  assert.deepEqual(frame.subarray(partial * 3, partial * 3 + 3), fields.base.subarray(partial * 3, partial * 3 + 3));
  assert.deepEqual(frame.subarray(30 * size * 3), fields.base.subarray(30 * size * 3));
  for (let pixel = 0; pixel < size * size; pixel += 1) for (let channel = 0; channel < 3; channel += 1) {
    const difference = frame[pixel * 3 + channel] - fields.base[pixel * 3 + channel];
    assert.ok(difference >= 0 && difference <= PRESETS.code.maximumRgbLift[channel]);
  }
  assert.deepEqual(renderFrame(fields, 0), renderFrame(fields, 143));
  assert.deepEqual(renderFrame(fields, 0), fields.base);
});

test('pale marble gains obvious cool light without a clipped or darkened face', () => {
  const size = 100;
  const rgba = Buffer.alloc(size * size * 4, 255);
  for (let pixel = 0; pixel < size * size; pixel += 1) {
    rgba.fill(200, pixel * 4, pixel * 4 + 3);
  }
  const fields = prepareFields(rgba, Buffer.alloc(size * size, 200), Buffer.alloc(size * size, 200), size, PRESETS.code);
  const peak = renderFrame(fields, 36);
  const face = (15 * size + 49) * 3;
  assert.ok(peak[face + 2] - peak[face] > 25, 'face must read visibly cooler, not just brighter');
  assert.ok(peak[face + 1] - 200 > 20, 'screen spill includes luminous white/cyan, not blue-only paint');
  for (let channel = 0; channel < 3; channel += 1) assert.ok(peak[face + channel] >= 200 && peak[face + channel] < 255);
  const delta = roiColorDelta(fields.base, peak, fields.alpha, PRESETS.code.roi, size);
  assert.ok(delta.blueMinusRed > 15);
  assert.deepEqual(peak.subarray(60 * size * 3), fields.base.subarray(60 * size * 3));
});

test('perceptual comparison finds actual minimum and peak instead of sampling equal phases', () => {
  const pixels = Buffer.concat([Buffer.alloc(12, 20), Buffer.alloc(12, 180), Buffer.alloc(12, 30)]);
  const actual = roiExtremes(pixels, Buffer.alloc(4, 255), { x: .5, y: .5, sx: 1, sy: 1 }, 2);
  assert.equal(actual.minimum.frame, 0);
  assert.equal(actual.maximum.frame, 1);
});

test('short bronze side glints repeat after three seconds with exact quiet intervals', () => {
  const topLeft = PRESETS.mixes.regions.find((area) => area.name === 'left upper bronze frame');
  assert.ok(spatialWeight(.17, .058, topLeft) > .99);
  assert.equal(spatialWeight(.50, .07, topLeft), 0);
  for (const area of PRESETS.mixes.regions) {
    assert.equal(glintWave(0, 144, area.phase), 0);
    assert.equal(glintWave(60, 144, area.phase), 0);
    assert.equal(glintWave(143, 144, area.phase), 0);
    for (let frame = 0; frame < 71; frame += 1) {
      assert.ok(Math.abs(glintWave(frame, 144, area.phase) - glintWave(frame + 72, 144, area.phase)) < 1e-12);
    }
  }
});

test('bronze glints never pulse the statue face/chest or alter the original quiet frame', () => {
  const size = 100;
  const rgba = Buffer.alloc(size * size * 4, 255);
  for (let pixel = 0; pixel < size * size; pixel += 1) rgba.fill(120, pixel * 4, pixel * 4 + 3);
  const fields = prepareFields(rgba, Buffer.alloc(size * size, 120), Buffer.alloc(size * size, 105), size, PRESETS.mixes);
  for (const frame of [0, 60, 143]) assert.deepEqual(renderFrame(fields, frame), fields.base);
  const peak = renderFrame(fields, 24);
  assert.notDeepEqual(peak, fields.base);
  for (let y = 25; y <= 68; y += 1) for (let x = 43; x <= 57; x += 1) {
    const pixel = (y * size + x) * 3;
    assert.deepEqual(peak.subarray(pixel, pixel + 3), fields.base.subarray(pixel, pixel + 3));
  }
});
