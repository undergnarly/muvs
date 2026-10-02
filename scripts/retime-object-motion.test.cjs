'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildSchedule, SEGMENTS } = require('./retime-object-motion.cjs');

test('six-second schedule contains only complete approved prefix frames', () => {
  const schedule = buildSchedule(18);
  assert.equal(schedule.length, 144);
  assert.ok(schedule.every((frame) => Number.isInteger(frame) && frame >= 0 && frame <= 18));
  assert.equal(schedule[0], 0);
  assert.equal(schedule.at(-1), 0);
  assert.deepEqual([...new Set(schedule)].sort((a, b) => a - b), Array.from({ length: 19 }, (_, i) => i));
});

test('holds remain exact and cosine travel is monotonic in each direction', () => {
  const schedule = buildSchedule();
  assert.ok(schedule.slice(0, 18).every((frame) => frame === 0));
  assert.ok(schedule.slice(54, 72).every((frame) => frame === 18));
  assert.ok(schedule.slice(108).every((frame) => frame === 0));
  for (let i = 19; i < 54; i += 1) assert.ok(schedule[i] >= schedule[i - 1]);
  for (let i = 73; i < 108; i += 1) assert.ok(schedule[i] <= schedule[i - 1]);
  for (let i = 1; i < 144; i += 1) assert.ok(Math.abs(schedule[i] - schedule[i - 1]) <= 1);
  assert.equal(schedule[18], schedule[19]);
  assert.equal(schedule[52], schedule[53]);
  assert.equal(schedule[72], schedule[73]);
  assert.equal(schedule[106], schedule[107]);
  assert.deepEqual(schedule.slice(18, 54), schedule.slice(72, 108).reverse());
});

test('schedule remains bounded for valid alternate prefix and rejects unsafe bounds', () => {
  for (const maximum of [1, 12, 24, 48]) {
    const schedule = buildSchedule(maximum);
    assert.equal(Math.max(...schedule), maximum);
    assert.equal(Math.min(...schedule), 0);
  }
  for (const invalid of [0, -1, 49, 1.5, NaN, Infinity, '18']) assert.throws(() => buildSchedule(invalid));
  assert.equal(SEGMENTS.reduce((total, segment) => total + segment.frames, 0), 144);
});
