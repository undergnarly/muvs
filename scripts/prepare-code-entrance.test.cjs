'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { rasterMask, isolate, remove, transferCleanPlate } = require('./prepare-code-entrance.cjs');

test('isolating layers never changes original marble RGB', () => {
  const source = Buffer.from([10,20,30,255, 40,50,60,100, 70,80,90,0]);
  const mask = Buffer.from([255,128,0]);
  const layer = isolate(source, mask);
  assert.deepEqual(layer, Buffer.from([10,20,30,255, 40,50,60,50, 70,80,90,0]));
  const base = remove(source, mask);
  assert.deepEqual(base, Buffer.from([10,20,30,0, 40,50,60,50, 70,80,90,0]));
  assert.equal(source[3], 255);
  assert.throws(() => isolate(Buffer.alloc(3), mask), /dimensions/);
});

test('asset mattes have exact source dimensions with transparent surroundings', async () => {
  const mask = await rasterMask(['M10 10 H20 V20 H10 Z']);
  assert.equal(mask.length, 1024 * 1024);
  assert.equal(mask[0], 0);
  assert.equal(mask[15 * 1024 + 15], 255);
  assert.equal(mask[30 * 1024 + 30], 0);
});

test('clean transfer is strictly local and keys background without changing outside RGBA', () => {
  const original = Buffer.from([20,30,40,255, 50,60,70,255, 80,90,100,200]);
  const clean = Buffer.from([126,126,126, 210,215,220, 250,250,250]);
  const out = transferCleanPlate(original, clean, Buffer.from([255,255,0]), 3, 1, 0);
  assert.equal(out[3], 0);
  assert.deepEqual(out.subarray(4,8), Buffer.from([210,215,220,255]));
  assert.deepEqual(out.subarray(8), original.subarray(8));
  assert.equal(original[3], 255);
});
