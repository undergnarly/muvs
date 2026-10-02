'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeMask, composite, verify } = require('./prepare-music-reference.cjs');

test('patch has compact support with a smooth outer feather', () => {
  const mask = makeMask(20, 20, [[[6,6],[13,6],[13,13],[6,13]]], 3);
  assert.equal(mask[9 * 20 + 9], 1);
  assert.equal(mask[0], 0);
  assert.ok(mask[9 * 20 + 4] > 0 && mask[9 * 20 + 4] < 1);
  assert.equal(mask[9 * 20 + 3], 0);
});

test('composite preserves every alpha byte and all channels outside the patch', () => {
  const rgba = Buffer.from(Array.from({ length: 20 * 20 * 4 }, (_, i) => i % 256));
  const rgb = Buffer.alloc(20 * 20 * 3, 230);
  const mask = makeMask(20, 20, [[[6,6],[13,6],[13,13],[6,13]]], 3);
  const output = composite(rgba, rgb, mask, 20, 20);
  const report = verify(rgba, output, mask);
  assert.equal(report.alphaMismatch, 0); assert.equal(report.outsideMismatch, 0);
  assert.ok(report.changedPixels > 0);
});

test('transparent RGB is retained even inside a patch; invalid geometry is rejected', () => {
  const original = Buffer.from([12,34,56,0]);
  assert.deepEqual(composite(original, Buffer.from([200,200,200]), Float32Array.of(1), 1, 1), original);
  assert.throws(() => composite(original, Buffer.alloc(2), Float32Array.of(1), 1, 1), /dimensions/);
  assert.throws(() => verify(original, Buffer.from([13,34,56,0]), Float32Array.of(0)), /Preservation failed/);
});
