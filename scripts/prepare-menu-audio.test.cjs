'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyze, normalize, circularBlend, verify } = require('./prepare-menu-audio.cjs');

test('checked-in opt-in audio has intact bytes, safe levels, exact duration and a soft loop seam', () => {
  const result = verify();
  assert.equal(result.verifiedAssets, 5);
  assert.ok(result.totalBytes < 300000);
});

test('level normalization respects the peak headroom rather than forcing a transient louder', () => {
  const samples = new Float32Array([0, 0, 0.95, 0.95, 0, 0]);
  normalize(samples, -10, -7);
  const stats = analyze(samples);
  assert.ok(stats.peakDbfs <= -6.999);
  assert.equal(stats.clippedSamples, 0);
});

test('circular overlap rejects a short source and preserves the natural tail-to-start continuation', () => {
  assert.throws(() => circularBlend(new Float32Array(100), 24, 2), /Not enough/);
  const frames = 44100;
  const source = new Float32Array((frames + 4410) * 2);
  for (let frame = 0; frame < source.length / 2; frame++) {
    source[frame * 2] = source[frame * 2 + 1] = Math.sin(frame / 40) * 0.1;
  }
  const loop = circularBlend(source, 1, 0.1);
  assert.equal(loop.length, frames * 2);
  assert.equal(loop[0], source[frames * 2]);
  assert.equal(loop[8820], source[8820]);
});
