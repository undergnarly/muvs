"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createAnalytics, DEDUPE_MS, MAX_RECENT, MAX_DEDUPE } = require("./dubplates-analytics");
const id = (number) => number.toString(16).padStart(32, "0");

async function analyticsFixture(t) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "muvs-analytics-test-"));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  return path.join(directory, "analytics.json");
}

test("analytics persists only aggregate counts and bounded recent downloads, not visitor identities", async (t) => {
  const filename = await analyticsFixture(t);
  let clock = Date.parse("2026-10-18T00:00:00Z");
  const store = createAnalytics(filename, { now: () => clock });
  const tracks = [{ id: id(1), title: "One", artist: "MUVS" }, { id: id(2), title: "Two", artist: "MUVS" }];
  const start = store.snapshot(tracks).since;
  assert.equal(createAnalytics(filename).snapshot(tracks).since, start, "zero-count start date survives restart");
  assert.equal(store.listen(id(1), "f".repeat(32)), true);
  assert.equal(store.listen(id(1), "f".repeat(32)), false);
  assert.equal(store.listen(id(2), "f".repeat(32)), true, "dedupe is per track");
  store.download([id(1), id(1), id(2)], "wav", "zip");
  for (let index = 0; index < MAX_RECENT + 2; index += 1) { clock += 1000; store.download([id(1)], "mp3", "file"); }
  const snapshot = store.snapshot(tracks);
  assert.equal(snapshot.totals.listens, 2);
  assert.equal(snapshot.totals.downloads, MAX_RECENT + 4);
  assert.equal(snapshot.tracks[0].wav, 1);
  assert.equal(snapshot.tracks[0].mp3, MAX_RECENT + 2);
  assert.equal(snapshot.recentDownloads.length, MAX_RECENT);
  const persisted = await fsp.readFile(filename, "utf8");
  for (const forbidden of ["sessionId", "userAgent", "ipAddress", "f".repeat(32)]) assert.equal(persisted.includes(forbidden), false);
  assert.deepEqual(createAnalytics(filename).snapshot(tracks), snapshot);
  snapshot.recentDownloads[0].trackIds.push(id(9));
  assert.equal(store.snapshot(tracks).recentDownloads[0].trackIds.length, 1, "snapshots do not mutate persistence");
  clock += DEDUPE_MS;
  assert.equal(store.listen(id(1), "f".repeat(32)), true);
});

test("analytics session dedupe is bounded, expires, and rejects invalid input", async (t) => {
  const filename = await analyticsFixture(t);
  let clock = 1;
  const store = createAnalytics(filename, { now: () => clock });
  // Distinct sessions for one published track: no unbounded visitor memory.
  for (let index = 0; index < MAX_DEDUPE; index += 1) assert.equal(store.listen(id(1), id(index)), true);
  assert.equal(store.listen(id(1), id(MAX_DEDUPE)), false);
  clock += DEDUPE_MS;
  assert.equal(store.listen(id(1), id(MAX_DEDUPE)), true);
  assert.throws(() => store.listen("../private", id(1)));
  assert.throws(() => store.listen(id(1), "invalid"));
  assert.throws(() => store.download([id(1)], "flac", "zip"));
  assert.throws(() => store.download([id(1)], "mp3", "unknown"));
});

test("corrupt analytics fails closed and a failed atomic write does not change in-memory counts", async (t) => {
  const filename = await analyticsFixture(t);
  const store = createAnalytics(filename);
  const tracks = [{ id: id(1), title: "One", artist: "MUVS" }];
  const before = store.snapshot(tracks);
  const write = fs.writeFileSync;
  fs.writeFileSync = () => { throw new Error("disk full"); };
  try { assert.throws(() => store.download([id(1)], "mp3", "file")); }
  finally { fs.writeFileSync = write; }
  assert.deepEqual(store.snapshot(tracks), before);
  await fsp.writeFile(filename, "{broken");
  assert.throws(() => createAnalytics(filename));
  assert.equal(await fsp.readFile(filename, "utf8"), "{broken", "invalid evidence is not overwritten");
});
