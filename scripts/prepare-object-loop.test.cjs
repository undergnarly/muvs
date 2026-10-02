'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { interiorMask, interiorMotionMask, seamWeight, estimateShift, temporalStats, parseLightLimit, parseMotionRegion, restrictMotionRegion, parseArgs, prepare } = require('./prepare-object-loop.cjs');

test('interior motion preserves alpha weighting without dilating tiny defects', () => {
  const alpha = Buffer.alloc(40 * 40, 255);
  alpha[20 * 40 + 20] = 240;
  alpha[21 * 40 + 20] = 171;
  const before = Buffer.from(alpha);
  const mask = interiorMotionMask(alpha, 40, 40, [5, 5, 30, 30], 4);
  assert.equal(mask[20 * 40 + 20], 240);
  assert.equal(mask[20 * 40 + 21], 255);
  assert.equal(mask[21 * 40 + 20], 0);
  assert.equal(mask[21 * 40 + 21], 255);
  assert.equal(mask[0], 0);
  assert.deepEqual(alpha, before);
  for (let i = 0; i < alpha.length; i++) if (mask[i] > 0) assert.ok(alpha[i] >= 200);
});

test('interior motion is opt-in and cannot operate without a bounded region', async () => {
  const args = ['--original', 'a.webp', '--video', 'b.mp4', '--out', 'c'];
  assert.throws(() => parseArgs([...args, '--interior-motion']), /requires --motion-region/);
  assert.throws(() => interiorMotionMask(Buffer.alloc(400), 20, 20), /requires --motion-region/);
  await assert.rejects(prepare({ interiorMotion: true }), /requires --motion-region/);
  const options = parseArgs([...args, '--interior-motion', '--motion-region', '423,488,95,156']);
  assert.equal(options.interiorMotion, true);
  assert.deepEqual(options.motionRegion, [423,488,95,156]);
});

test('localized motion leaves every pixel outside the selected region untouched', () => {
  const mask = Buffer.alloc(40 * 40, 255);
  const restricted = restrictMotionRegion(mask, 40, 40, [10, 10, 20, 20], 4);
  assert.equal(restricted[20 * 40 + 20], 255);
  assert.equal(restricted[20 * 40 + 11], 40);
  assert.equal(restricted[20 * 40 + 10], 0);
  assert.equal(restricted[20 * 40 + 30], 0);
  assert.equal(restricted[9 * 40 + 20], 0);
  assert.equal(mask[20 * 40 + 10], 255);
  assert.strictEqual(restrictMotionRegion(mask, 40, 40, null), mask);
});

test('motion region rejects invalid and out-of-frame rectangles', () => {
  assert.equal(parseMotionRegion(), null);
  assert.deepEqual(parseMotionRegion('430,480,100,150'), [430, 480, 100, 150]);
  for (const value of ['0,0,721,20', '0,710,20,20', '-1,0,20,20', '0,0,1,20', '0,0,20', '0,0,20,NaN']) {
    assert.throws(() => parseMotionRegion(value));
  }
});

test('motion mask preserves translucent shadows, outer rim and interior holes', () => {
  const size = 21;
  const alpha = Buffer.alloc(size * size, 255);
  alpha[10 * size + 10] = 100;
  const mask = interiorMask(alpha, size, size);
  assert.equal(mask[0], 0);
  assert.equal(mask[1 * size + 10], 0);
  assert.equal(mask[10 * size + 10], 0);
  assert.equal(mask[10 * size + 11], 0);
  assert.equal(mask[10 * size + 12], 0);
  assert.ok(mask[10 * size + 13] > 0 && mask[10 * size + 13] < 255);
  assert.equal(mask[5 * size + 5], 255);
  assert.throws(() => interiorMask(Buffer.alloc(3), 2, 2));
});

test('seam returns exactly to the original on first and last frame with smooth fade', () => {
  const last = 143 / 24;
  assert.equal(seamWeight(0, last), 0);
  assert.equal(seamWeight(last, last), 0);
  assert.equal(seamWeight(0.25, last), 1);
  assert.equal(seamWeight(last - 0.25, last), 1);
  assert.equal(seamWeight(0.125, last), 0.5);
  assert.equal(seamWeight(-1, last), 0);
  assert.equal(seamWeight(last + 1, last), 0);
});

test('QA detects translation without modifying images', () => {
  const size = 40;
  const reference = Buffer.alloc(size * size);
  const shifted = Buffer.alloc(size * size);
  for (let y = 8; y < 30; y += 1) for (let x = 8; x < 30; x += 1) reference[y * size + x] = (x * 43 + y * 73) % 255;
  for (let y = 0; y < size - 1; y += 1) for (let x = 0; x < size - 2; x += 1) shifted[(y + 1) * size + x + 2] = reference[y * size + x];
  const result = estimateShift(reference, shifted, size, size, Buffer.alloc(size * size, 255));
  assert.equal(result.dx, 2);
  assert.equal(result.dy, 1);
  assert.ok(result.score > 0.99);
  assert.equal(result.reliable, true);
});

test('CLI refuses ambiguous arguments and out-of-policy encoding values', () => {
  assert.throws(() => parseArgs(['--original', 'a.webp']));
  assert.throws(() => parseArgs(['--original', 'a.webp', '--video', 'b.mp4', '--out', 'c', '--crf', '35']));
  assert.throws(() => parseArgs(['--wat', 'x']));
  const options = parseArgs(['--original', 'a.webp', '--video', 'b.mp4', '--out', 'c']);
  assert.equal(options.crf, 22);
  assert.equal(options.maxDrift, 4);
});

test('encoded seam QA ignores fully transparent pixels and measures actual wrap brightness', () => {
  const frames = Buffer.from([10, 10, 10, 0, 0, 0, 20, 20, 20, 100, 100, 100, 10, 10, 10, 255, 255, 255]);
  const stats = temporalStats(frames, Buffer.from([255, 0]), 2, 1);
  assert.equal(stats.wrap.mae, 0);
  assert.equal(stats.wrap.brightnessDelta, 0);
  assert.equal(stats.maximumAdjacent, 10);
  assert.equal(stats.frames, 3);
});

test('existing output is rejected before inputs can be touched', async (t) => {
  const fsp = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'muvs-loop-refusal-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const stem = path.join(directory, 'existing');
  await fsp.writeFile(`${stem}.mp4`, 'preserve this');
  await assert.rejects(prepare({ out: stem, original: 'missing.webp', video: 'missing.mp4' }), /Refusing to overwrite/);
  assert.equal(await fsp.readFile(`${stem}.mp4`, 'utf8'), 'preserve this');
});

test('lighting-only limits are bounded and preserve explicit RGB ordering', () => {
  assert.deepEqual(parseLightLimit(), [8, 8, 8]);
  assert.deepEqual(parseLightLimit('14'), [14, 14, 14]);
  assert.deepEqual(parseLightLimit('8,20,8'), [8, 20, 8]);
  for (const value of ['8,8', '-1', '33', '1.5', '8,no,8']) assert.throws(() => parseLightLimit(value));
  const options = parseArgs(['--original', 'a.webp', '--video', 'b.mp4', '--out', 'c', '--lighting-only', '--light-limit', '8,20,8']);
  assert.equal(options.lightingOnly, true);
  assert.deepEqual(options.lightLimit, [8, 20, 8]);
});
