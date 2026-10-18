"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const express = require("express");
const createRouter = require("./dubplates");
const { validateTrack, validCover, audioKind, safeFilename, peaksFromBins, exportFilenames, normalizeTags, analyzeLoudness } = createRouter;
const ffmpeg = require("ffmpeg-static");

const trackInput = (extra = {}) => ({
  title: "Shanti Roko", artist: "MUVS", genre: "Dub", bpm: 140,
  musicalKey: "Dm", releaseTitle: "Veiled", type: "dubplate", releaseDate: "2026-09-27",
  coverImage: "/images/cover.webp", notes: "For friends", published: false, assetId: null, ...extra,
});

async function fixture(t, before, routerOptions = {}) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "muvs-dubplates-test-"));
  if (before) await before(directory);
  const app = express();
  app.use(express.json());
  const hasAdminSession = (req) => req.get("authorization") === "test-admin";
  const requireAdmin = (req, res, next) => {
    if (!hasAdminSession(req)) return res.status(401).json({ error: "Unauthorized" });
    if (req.get("origin") && req.get("origin") !== `http://${req.get("host")}`) return res.status(403).json({ error: "Invalid origin" });
    return next();
  };
  app.use("/api/dubplates", createRouter({ dataDir: directory, hasAdminSession, requireAdmin, ...routerOptions }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/dubplates`;
  t.after(async () => {
    await new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); });
    await fsp.rm(directory, { recursive: true, force: true });
  });
  const request = (url = "", options = {}) => fetch(`${base}${url}`, options);
  const admin = (url, options = {}) => request(url, { ...options, headers: { authorization: "test-admin", ...options.headers } });
  const json = (body, method = "POST") => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { request, admin, json, directory, base };
}

function wavFixture(duration = 0.3, rate = 44100) {
  const count = Math.round(duration * rate);
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF", 0); data.writeUInt32LE(data.length - 8, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index += 1) data.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / rate) * (index < count / 2 ? 24000 : 8000)), 44 + index * 2);
  return data;
}

const fixtureId = (value) => value.toString(16).padStart(32, "0");
async function readyCatalog(directory, { count = 1, duration = 1, large = false } = {}) {
  const root = path.join(directory, "dubplates");
  const catalog = { version: 1, tracks: [], assets: {} };
  for (let index = 0; index < count; index += 1) {
    const id = fixtureId(index + 1);
    const assetId = fixtureId(index + 1001);
    const folder = path.join(root, "assets", assetId);
    await fsp.mkdir(folder, { recursive: true });
    await fsp.writeFile(path.join(folder, "audio.wav"), wavFixture(duration));
    await fsp.writeFile(path.join(folder, "audio.mp3"), large ? Buffer.alloc(16 * 1024 * 1024, 7) : Buffer.from("ID3-export-fixture"));
    catalog.assets[assetId] = { id: assetId, status: "ready", duration, formats: ["wav", "mp3"], peaks: [0.2, 0.8] };
    catalog.tracks.push({ id, ...trackInput({ title: "Same name", published: true, assetId, tags: ["Jungle", "Drum and bass"], rating: 8.5, productionStage: "mixed" }), createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" });
  }
  await fsp.writeFile(path.join(root, "catalog.json"), JSON.stringify(catalog));
  return catalog;
}

async function exportTicket(context, ids, format = "mp3", delivery, asAdmin = false) {
  const request = asAdmin ? context.admin : context.request;
  const response = await request("/exports", context.json({ ids, format, ...(delivery ? { delivery } : {}) }));
  return { response, body: await response.json() };
}

function download(context, result, options) {
  return fetch(`${new URL(context.base).origin}${result.body.downloadUrl}`, options);
}

async function uploadAudio(context, bytes, filename, mime) {
  const form = new FormData();
  form.append("audio", new Blob([bytes], { type: mime }), filename);
  const response = await context.admin("/admin/assets", { method: "POST", body: form });
  const initial = await response.json();
  assert.equal(response.status, 202, JSON.stringify(initial));
  const started = Date.now();
  for (;;) {
    const status = await (await context.admin(`/admin/assets/${initial.id}`)).json();
    if (status.status !== "processing") return status;
    if (Date.now() - started > 20000) throw new Error("Audio processing timed out in test");
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

test("metadata rejects remote paths, traversal, malformed dates and unsupported values", () => {
  assert.equal(validateTrack(trackInput(), {}).bpm, 140);
  assert.equal(validateTrack(trackInput({ bpm: "", published: false }), {}).bpm, null);
  for (const patch of [
    { coverImage: "https://evil.test/a.jpg" }, { coverImage: "/uploads/../secret.png" },
    { coverImage: "/uploads/%2e%2e/secret.png" }, { coverImage: "/uploads/x.svg" },
    { coverImage: "/uploads/audio/x.png" }, { releaseDate: "2026-02-30" },
    { published: "false" }, { type: "anything" }, { title: "" },
    { bpm: -1 }, { bpm: "Infinity" }, { assetId: "../../etc/passwd" }, { published: true },
  ]) assert.throws(() => validateTrack(trackInput(patch), {}), { status: 400 });
  assert.equal(validCover("/uploads/my-cover 1.jpg"), true);
  assert.equal(validCover("/uploads/обложка-(1).webp"), true);
  assert.equal(validCover("//evil.test/cover.jpg"), false);
  assert.equal(audioKind(wavFixture()), "wav");
  assert.equal(audioKind(Buffer.from("ID3test")), "mp3");
  assert.equal(audioKind(Buffer.from("#EXTM3U")), null);
  assert.match(safeFilename({ artist: "../../CON", title: "<bad>|../../Title" }, "mp3"), /^CON - badTitle\.mp3$/);
  assert.deepEqual(peaksFromBins([0.2, 0.8], 2), [0.25, 1]);
});

test("library and admin routes fail closed with no passwords on the public library", async (t) => {
  const context = await fixture(t);
  const publicResponse = await context.request();
  assert.equal(publicResponse.status, 200);
  assert.deepEqual(await publicResponse.json(), { tracks: [] });
  assert.equal(publicResponse.headers.get("x-robots-tag"), "noindex, nofollow, noarchive");
  assert.match(publicResponse.headers.get("cache-control"), /no-store/);
  for (const [url, method] of [["/admin/tracks", "GET"], ["/admin/tracks", "POST"], ["/admin/assets", "POST"], ["/admin/assets/none", "GET"], ["/admin/tracks/none", "DELETE"]]) {
    assert.equal((await context.request(url, { method })).status, 401);
  }
  assert.equal((await context.admin("/admin/tracks", { ...context.json(trackInput()), headers: { "content-type": "application/json", origin: "https://evil.test" } })).status, 403);
  const draft = await context.admin("/admin/tracks", context.json(trackInput()));
  assert.equal(draft.status, 201);
  const { track } = await draft.json();
  assert.equal(track.assetId, null);
  assert.equal(track.previewUrl, null);
  assert.equal((await (await context.request()).json()).tracks.length, 0);
  assert.equal((await (await context.admin("/admin/tracks")).json()).tracks.length, 1);
  assert.equal((await context.admin(`/admin/tracks/${track.id}`, context.json(trackInput({ published: true }), "PUT"))).status, 400);
  assert.equal((await context.request(`/tracks/${track.id}/audio/mp3`)).status, 404);
  assert.equal((await context.request("/tracks/%2e%2e%2fsecret/audio/mp3")).status, 404);
  assert.equal((await context.request("/exports/no-such-ticket")).status, 404);
  assert.equal((await context.request("/exports", context.json({ ids: [], format: "mp3" }))).status, 400);
  assert.equal((await context.request("/exports", context.json({ ids: [track.id], format: "flac" }))).status, 400);
  assert.equal((await context.request("/exports", context.json({ ids: Array.from({ length: 51 }, (_, i) => i.toString(16).padStart(32, "0")), format: "mp3" }))).status, 400);
});

test("real WAV processing, protected previews, MP3-only uploads, ZIP export and reversible deletion", async (t) => {
  const context = await fixture(t);
  const original = wavFixture();
  const asset = await uploadAudio(context, original, "original.wav", "audio/wav");
  assert.equal(asset.status, "ready", asset.error);
  assert.ok(["ready", "unavailable"].includes(asset.loudnessStatus));
  assert.ok(asset.integratedLufs === null || Number.isFinite(asset.integratedLufs));
  assert.deepEqual(asset.formats, ["wav", "mp3"]);
  assert.ok(Math.abs(asset.duration - 0.3) < 0.005);
  assert.equal(asset.peaks.length, 256);
  assert.ok(asset.peaks.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1));
  assert.ok(new Set(asset.peaks).size > 1, "peaks reflect actual audio dynamics");
  const originalPath = path.join(context.directory, "dubplates", "assets", asset.id, "audio.wav");
  assert.deepEqual(await fsp.readFile(originalPath), original, "WAV original is byte-for-byte preserved");
  const draftResponse = await context.admin("/admin/tracks", context.json(trackInput({ assetId: asset.id })));
  assert.equal(draftResponse.status, 201);
  const { track: draft } = await draftResponse.json();
  assert.equal((await context.request(`/tracks/${draft.id}/audio/mp3`)).status, 404);
  const preview = await context.admin(`/tracks/${draft.id}/audio/mp3`, { headers: { range: "bytes=0-9" } });
  assert.equal(preview.status, 206);
  assert.equal((await preview.arrayBuffer()).byteLength, 10);
  assert.equal(preview.headers.get("content-type"), "audio/mpeg");
  assert.equal((await context.admin(`/tracks/${draft.id}/audio/mp3`, { headers: { range: "bytes=999999999-" } })).status, 416);
  assert.equal((await context.request("/exports", context.json({ ids: [draft.id], format: "mp3" }))).status, 404);
  const publishedResponse = await context.admin(`/admin/tracks/${draft.id}`, context.json(trackInput({ assetId: asset.id, published: true }), "PUT"));
  assert.equal(publishedResponse.status, 200);
  const library = await (await context.request()).json();
  assert.equal(library.tracks.length, 1);
  assert.equal(library.tracks[0].assetId, undefined);
  assert.equal(JSON.stringify(library).includes(context.directory), false);
  const wav = await context.request(`/tracks/${draft.id}/audio/wav`);
  assert.deepEqual(Buffer.from(await wav.arrayBuffer()), original);
  const mp3Bytes = await fsp.readFile(path.join(context.directory, "dubplates", "assets", asset.id, "audio.mp3"));
  const mp3 = await uploadAudio(context, mp3Bytes, "test.mp3", "audio/mpeg");
  assert.equal(mp3.status, "ready", mp3.error);
  assert.deepEqual(mp3.formats, ["mp3"]);
  assert.equal(fs.existsSync(path.join(context.directory, "dubplates", "assets", mp3.id, "audio.wav")), false);
  const { track: mp3Track } = await (await context.admin("/admin/tracks", context.json(trackInput({ title: "MP3 only", assetId: mp3.id, published: true })))).json();
  assert.equal((await context.request("/exports", context.json({ ids: [draft.id, mp3Track.id], format: "wav" }))).status, 409);
  assert.equal((await context.request("/exports", context.json({ ids: [draft.id, "a".repeat(32)], format: "mp3" }))).status, 404);
  assert.equal((await context.request("/exports", context.json({ ids: [draft.id, draft.id], format: "mp3" }))).status, 400);
  assert.equal((await context.request("/exports", context.json({ ids: ["../../secret"], format: "wav" }))).status, 400);
  const exportResult = await context.request("/exports", context.json({ ids: [draft.id, mp3Track.id], format: "mp3" }));
  assert.equal(exportResult.status, 200);
  const { downloadUrl } = await exportResult.json();
  const zipResponse = await fetch(`${new URL(context.base).origin}${downloadUrl}`);
  assert.equal(zipResponse.status, 200);
  assert.equal(zipResponse.headers.get("content-type"), "application/zip");
  const zip = Buffer.from(await zipResponse.arrayBuffer());
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.ok(zip.includes(Buffer.from("MUVS - Shanti Roko.mp3")));
  assert.ok(zip.includes(Buffer.from("MUVS - MP3 only.mp3")));
  assert.equal(zip.includes(Buffer.from("01 - ")), false);
  assert.equal((await fetch(`${new URL(context.base).origin}${downloadUrl}`)).status, 404, "ticket is single use");
  const beforeDeleteTicket = await (await context.request("/exports", context.json({ ids: [draft.id], format: "wav" }))).json();
  assert.equal((await context.admin(`/admin/tracks/${draft.id}`, { method: "DELETE" })).status, 204);
  assert.equal((await context.request(`/tracks/${draft.id}/audio/wav`)).status, 404);
  assert.equal((await fetch(`${new URL(context.base).origin}${beforeDeleteTicket.downloadUrl}`)).status, 404, "ticket rechecks publication at download");
  assert.deepEqual(await fsp.readFile(originalPath), original, "soft delete preserves the original");
  const persisted = JSON.parse(await fsp.readFile(path.join(context.directory, "dubplates", "catalog.json"), "utf8"));
  assert.ok(persisted.tracks.find((item) => item.id === draft.id).deletedAt);
  assert.equal((await context.request("/exports", context.json({ ids: [mp3Track.id], format: "mp3" }))).status, 200);
  assert.equal((await context.request("/exports", context.json({ ids: [mp3Track.id], format: "mp3" }))).status, 429, "ticket creation is rate limited");
});

test("invalid uploads are rejected and processing errors are sanitized and cleaned up", async (t) => {
  const context = await fixture(t);
  for (const [name, mime, contents] of [["playlist.wav", "audio/wav", "#EXTM3U\nhttp://127.0.0.1/secret"], ["fake.mp3", "text/plain", "ID3fake"], ["file.exe", "audio/mpeg", "ID3fake"]]) {
    const form = new FormData();
    form.append("audio", new Blob([contents], { type: mime }), name);
    const response = await context.admin("/admin/assets", { method: "POST", body: form });
    assert.equal(response.status, 400);
  }
  const broken = await uploadAudio(context, Buffer.from("ID3not really valid audio"), "broken.mp3", "audio/mpeg");
  assert.equal(broken.status, "error");
  assert.equal(broken.error.includes(context.directory), false);
  assert.equal(fs.existsSync(path.join(context.directory, "dubplates", "assets", broken.id)), false);
  assert.deepEqual(await fsp.readdir(path.join(context.directory, "dubplates", "incoming")), []);
});

test("restart recovers interrupted staging without deleting successful original assets", async (t) => {
  const interrupted = "a".repeat(32);
  const ready = "b".repeat(32);
  const context = await fixture(t, async (directory) => {
    const root = path.join(directory, "dubplates");
    await fsp.mkdir(path.join(root, "assets", interrupted), { recursive: true });
    await fsp.mkdir(path.join(root, "assets", ready), { recursive: true });
    await fsp.mkdir(path.join(root, "incoming"));
    await fsp.writeFile(path.join(root, "assets", interrupted, "audio.wav"), "partial");
    await fsp.writeFile(path.join(root, "assets", ready, "audio.wav"), "preserved original");
    await fsp.writeFile(path.join(root, "incoming", `${"c".repeat(32)}.upload`), "partial upload");
    await fsp.writeFile(path.join(root, "catalog.json"), JSON.stringify({ version: 1, tracks: [], assets: {
      [interrupted]: { id: interrupted, status: "processing" }, [ready]: { id: ready, status: "ready", formats: ["wav", "mp3"], duration: 1, peaks: [] },
    } }));
  });
  assert.equal((await (await context.admin(`/admin/assets/${interrupted}`)).json()).status, "error");
  assert.equal(fs.existsSync(path.join(context.directory, "dubplates", "assets", interrupted)), false);
  assert.equal(await fsp.readFile(path.join(context.directory, "dubplates", "assets", ready, "audio.wav"), "utf8"), "preserved original");
  assert.deepEqual(await fsp.readdir(path.join(context.directory, "dubplates", "incoming")), []);
});

test("tags, private rating and honest production stage validate, preserve legacy values and never leak rating", async (t) => {
  assert.deepEqual(normalizeTags([" Jungle ", "jungle", "Drum   and bass"]), ["Jungle", "Drum and bass"]);
  for (const patch of [
    { rating: "8" }, { rating: true }, { rating: -0.1 }, { rating: 10.1 }, { rating: NaN },
    { productionStage: "finished" }, { productionStage: false }, { tags: "jungle" }, { tags: [""] },
    { tags: ["a".repeat(81)] }, { tags: ["a\ninvalid"] }, { tags: Array(13).fill("dub") }, { tags: [1] },
  ]) assert.throws(() => validateTrack(trackInput(patch), {}), { status: 400 });
  assert.equal(validateTrack(trackInput({ rating: 0 }), {}).rating, 0);
  assert.equal(validateTrack(trackInput({ rating: 10 }), {}).rating, 10);
  assert.equal(validateTrack(trackInput({ rating: 8.5 }), {}).rating, 8.5);
  assert.equal(validateTrack(trackInput(), {}).productionStage, null, "legacy stage is never inferred");
  assert.deepEqual(validateTrack(trackInput(), {}, { tags: ["Dub"], rating: 5, productionStage: "sketch" }).tags, ["Dub"]);
  const names = exportFilenames([
    { track: { artist: "MUVS", title: "Tune" } }, { track: { artist: "muvs", title: "tune" } },
    { track: { artist: "MUVS", title: "Tune (2)" } }, { track: { title: "CON" } },
  ], "wav");
  assert.deepEqual(names, ["MUVS - Tune.wav", "muvs - tune (2).wav", "MUVS - Tune (2) (2).wav", "_CON.wav"]);
  assert.ok(Buffer.byteLength(safeFilename({ artist: "Я".repeat(160), title: "曲".repeat(160) }, "mp3")) < 200);
  const context = await fixture(t, (directory) => readyCatalog(directory));
  const publicTrack = (await (await context.request()).json()).tracks[0];
  assert.deepEqual(publicTrack.tags, ["Jungle", "Drum and bass"]);
  assert.equal(publicTrack.productionStage, "mixed");
  assert.equal(publicTrack.integratedLufs, null);
  assert.equal(Object.hasOwn(publicTrack, "rating"), false);
  const adminTrack = (await (await context.admin("/admin/tracks")).json()).tracks[0];
  assert.equal(adminTrack.rating, 8.5);
  const input = trackInput({ title: "Renamed", assetId: adminTrack.assetId, published: true });
  const updated = await (await context.admin(`/admin/tracks/${adminTrack.id}`, context.json(input, "PUT"))).json();
  assert.deepEqual(updated.track.tags, adminTrack.tags, "old admin clients do not erase new metadata");
  assert.equal(updated.track.rating, 8.5);
  assert.equal(updated.track.productionStage, "mixed");
  const cleared = await (await context.admin(`/admin/tracks/${adminTrack.id}`, context.json({ ...input, tags: [], rating: null, productionStage: null }, "PUT"))).json();
  assert.deepEqual(cleared.track.tags, []);
  assert.equal(cleared.track.rating, null);
  assert.equal(cleared.track.productionStage, null);
});

test("failed legacy metadata persistence restores exact in-memory metadata without leaked new values", async (t) => {
  const context = await fixture(t, async (directory) => {
    const catalog = await readyCatalog(directory);
    delete catalog.tracks[0].tags; delete catalog.tracks[0].rating; delete catalog.tracks[0].productionStage;
    await fsp.writeFile(path.join(directory, "dubplates", "catalog.json"), JSON.stringify(catalog));
  });
  const before = await (await context.request()).json();
  const filename = path.join(context.directory, "dubplates", "catalog.json");
  const originalFile = await fsp.readFile(filename, "utf8");
  const write = fs.writeFileSync;
  fs.writeFileSync = (target, ...args) => {
    if (String(target) === `${filename}.tmp`) throw Object.assign(new Error("permission denied"), { code: "EACCES" });
    return write(target, ...args);
  };
  try {
    const response = await context.admin(`/admin/tracks/${fixtureId(1)}`, context.json(trackInput({
      assetId: fixtureId(1001), published: true, tags: ["Must not leak"], rating: 9, productionStage: "mastered",
    }), "PUT"));
    assert.equal(response.status, 500);
  } finally { fs.writeFileSync = write; }
  assert.deepEqual(await (await context.request()).json(), before);
  assert.equal(await fsp.readFile(filename, "utf8"), originalFile);
});

test("malformed legacy private rating never escapes through public track metadata", async (t) => {
  const context = await fixture(t, async (directory) => {
    const catalog = await readyCatalog(directory);
    Object.assign(catalog.tracks[0], { rating: { private: "owner only" }, productionStage: "finished", tags: "old genre text" });
    await fsp.writeFile(path.join(directory, "dubplates", "catalog.json"), JSON.stringify(catalog));
  });
  const library = await (await context.request()).json();
  assert.equal(JSON.stringify(library).includes("owner only"), false);
  assert.equal(Object.hasOwn(library.tracks[0], "rating"), false);
  assert.equal(library.tracks[0].productionStage, null);
  assert.deepEqual(library.tracks[0].tags, []);
  assert.equal((await (await context.admin("/admin/tracks")).json()).tracks[0].rating, null);
});

test("download and listening analytics are protected, aggregate only completed transfers and dedupe sessions", async (t) => {
  const context = await fixture(t, (directory) => readyCatalog(directory, { count: 2 }));
  const ids = [fixtureId(1), fixtureId(2)];
  assert.equal((await context.request("/admin/stats")).status, 401);
  assert.equal((await context.request("/admin/loudness", context.json({}))).status, 401);
  const stats = async () => (await (await context.admin("/admin/stats")).json());
  assert.deepEqual((await stats()).totals, { downloads: 0, listens: 0 });
  const ticket = await exportTicket(context, ids);
  assert.equal(ticket.response.status, 200);
  assert.equal(ticket.body.delivery, "zip", "archives remain the default");
  assert.deepEqual((await stats()).totals, { downloads: 0, listens: 0 }, "creating a ticket is not a download");
  assert.equal((await download(context, ticket, { method: "HEAD" })).status, 200);
  assert.equal((await download(context, ticket, { headers: { range: "bytes=0-4" } })).status, 416);
  assert.deepEqual((await stats()).totals, { downloads: 0, listens: 0 }, "HEAD/range do not count or consume a ticket");
  const zip = await download(context, ticket);
  const bytes = Buffer.from(await zip.arrayBuffer());
  assert.ok(bytes.includes(Buffer.from("MUVS - Same name.mp3")));
  assert.ok(bytes.includes(Buffer.from("MUVS - Same name (2).mp3")));
  assert.equal((await download(context, ticket)).status, 404);
  assert.deepEqual((await stats()).totals, { downloads: 2, listens: 0 });
  assert.equal((await context.request(`/tracks/${ids[0]}/audio/mp3`)).status, 200);
  assert.equal((await stats()).totals.downloads, 2, "previews never count as downloads");
  const direct = await exportTicket(context, [ids[0]], "wav", "file");
  assert.equal(direct.body.filename, "MUVS - Same name.wav");
  const head = await download(context, direct, { method: "HEAD" });
  assert.equal(head.status, 200);
  const audio = await download(context, direct);
  assert.equal(audio.headers.get("content-type"), "audio/wav");
  assert.match(audio.headers.get("content-disposition"), /attachment; filename="MUVS - Same name.wav"/);
  assert.deepEqual(Buffer.from(await audio.arrayBuffer()), wavFixture(1));
  assert.equal((await stats()).totals.downloads, 3);
  assert.equal((await exportTicket(context, ids, "mp3", "file")).response.status, 400);
  assert.equal((await exportTicket(context, [ids[0]], "mp3", "unknown")).response.status, 400);
  const adminTicket = await exportTicket(context, [ids[0]], "mp3", "file", true);
  assert.equal((await download(context, adminTicket)).status, 200);
  assert.equal((await stats()).totals.downloads, 3, "admin-created tickets are excluded even without a cookie on GET");
  const normalTicket = await exportTicket(context, [ids[0]], "mp3", "file");
  assert.equal((await download(context, normalTicket, { headers: { authorization: "test-admin" } })).status, 200);
  assert.equal((await stats()).totals.downloads, 3, "admin download GET is excluded too");
  const event = { trackId: ids[0], type: "listen", sessionId: "d".repeat(32) };
  assert.equal((await context.request("/events", context.json(event))).status, 204);
  assert.equal((await context.request("/events", context.json(event))).status, 204);
  assert.equal((await context.request("/events", context.json({ ...event, trackId: ids[1] }))).status, 204);
  assert.equal((await context.admin("/events", context.json({ ...event, sessionId: "e".repeat(32) }))).status, 204);
  assert.equal((await context.request("/events", context.json({ ...event, sessionId: "bad" }))).status, 400);
  assert.equal((await context.request("/events", context.json({ ...event, type: "download" }))).status, 400);
  assert.equal((await context.request("/events", context.json({ ...event, trackId: "f".repeat(32) }))).status, 404);
  const result = await stats();
  assert.deepEqual(result.totals, { downloads: 3, listens: 2 });
  assert.equal(result.tracks[0].mp3, 1);
  assert.equal(result.tracks[0].wav, 1);
  assert.equal(result.tracks[1].downloads, 1);
  assert.equal(result.recentDownloads.length, 2);
  const persisted = await fsp.readFile(path.join(context.directory, "dubplates", "analytics.json"), "utf8");
  assert.equal(persisted.includes("session"), false);
  assert.equal(persisted.includes("127.0.0.1"), false);
  assert.equal(persisted.includes("d".repeat(32)), false);
  assert.deepEqual(JSON.parse(persisted).tracks[ids[0]].downloads, 2);
});

test("aborted export does not count a download", async (t) => {
  const context = await fixture(t, (directory) => readyCatalog(directory, { large: true }));
  const ticket = await exportTicket(context, [fixtureId(1)], "mp3", "file");
  const controller = new AbortController();
  const response = await download(context, ticket, { signal: controller.signal });
  const reader = response.body.getReader();
  await reader.read();
  controller.abort();
  await reader.cancel().catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 100));
  const stats = await (await context.admin("/admin/stats")).json();
  assert.equal(stats.totals.downloads, 0);
});

test("real integrated LUFS measures original audio without altering masters and backfill is safe and resumable", async (t) => {
  const context = await fixture(t, (directory) => readyCatalog(directory, { duration: 2 }));
  const assetId = fixtureId(1001);
  const filename = path.join(context.directory, "dubplates", "assets", assetId, "audio.wav");
  const before = await fsp.readFile(filename);
  const measured = await analyzeLoudness(ffmpeg, "wav", filename);
  assert.equal(typeof measured, "number");
  assert.ok(measured > -20 && measured < -1, `actual loudness ${measured}`);
  assert.deepEqual(await fsp.readFile(filename), before, "measurement is not normalization");
  const fresh = await uploadAudio(context, before, "fresh.wav", "audio/wav");
  assert.equal(fresh.loudnessStatus, "ready", "new uploads receive the same original-audio measurement");
  assert.equal(fresh.integratedLufs, measured);
  assert.equal((await context.admin("/admin/loudness", context.json({ ids: ["../secret"] }))).status, 400);
  assert.equal((await context.admin("/admin/loudness", context.json({ ids: [fixtureId(9999)] }))).status, 404);
  const first = await (await context.admin("/admin/loudness", context.json({}))).json();
  assert.equal(first.queued, 1);
  assert.deepEqual(first.queuedIds, [assetId]);
  const repeat = await (await context.admin("/admin/loudness", context.json({ ids: [assetId] }))).json();
  assert.equal(repeat.queued, 0);
  assert.equal(repeat.skipped, 1, "active asset cannot be analyzed concurrently");
  const until = Date.now() + 20000;
  let asset;
  do {
    asset = await (await context.admin(`/admin/assets/${assetId}`)).json();
    if (["ready", "error", "unavailable"].includes(asset.loudnessStatus)) break;
    await new Promise((resolve) => setTimeout(resolve, 30));
  } while (Date.now() < until);
  assert.equal(asset.loudnessStatus, "ready");
  assert.equal(asset.integratedLufs, measured);
  assert.equal((await (await context.request()).json()).tracks[0].integratedLufs, measured);
  assert.deepEqual(await fsp.readFile(filename), before);
  assert.equal((await (await context.admin("/admin/loudness", context.json({}))).json()).queued, 0, "completed backfill is skipped on resume");
  const second = await fixture(t, (directory) => readyCatalog(directory), { ffmpeg: path.join(context.directory, "missing-ffmpeg") });
  const secondFile = path.join(second.directory, "dubplates", "assets", assetId, "audio.wav");
  const preserved = await fsp.readFile(secondFile);
  await second.admin("/admin/loudness", second.json({}));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const failed = await (await second.admin(`/admin/assets/${assetId}`)).json();
  assert.equal(failed.status, "ready", "measurement failure never unpublishes a valid asset");
  assert.equal(failed.loudnessStatus, "error");
  assert.equal(failed.integratedLufs, null);
  assert.deepEqual(await fsp.readFile(secondFile), preserved);
  assert.equal((await (await second.request()).json()).tracks.length, 1);
});

test("silent audio has no invented LUFS value and restart resumes only explicit legacy reanalysis", async (t) => {
  const context = await fixture(t, async (directory) => {
    const catalog = await readyCatalog(directory, { duration: 2 });
    const assetId = fixtureId(1001);
    catalog.assets[assetId].loudnessStatus = "processing";
    await fsp.writeFile(path.join(directory, "dubplates", "catalog.json"), JSON.stringify(catalog));
    const silence = wavFixture(2);
    silence.fill(0, 44);
    await fsp.writeFile(path.join(directory, "dubplates", "assets", assetId, "audio.wav"), silence);
  });
  const filename = path.join(context.directory, "dubplates", "assets", fixtureId(1001), "audio.wav");
  assert.equal(await analyzeLoudness(ffmpeg, "wav", filename), null);
  const initial = await (await context.admin(`/admin/assets/${fixtureId(1001)}`)).json();
  assert.equal(initial.status, "ready");
  assert.equal(initial.loudnessStatus, "pending", "restart does not resume expensive work implicitly");
  const response = await (await context.admin("/admin/loudness", context.json({}))).json();
  assert.equal(response.queued, 1);
  let result;
  const deadline = Date.now() + 20000;
  do {
    result = await (await context.admin(`/admin/assets/${fixtureId(1001)}`)).json();
    if (result.loudnessStatus === "unavailable") break;
    await new Promise((resolve) => setTimeout(resolve, 30));
  } while (Date.now() < deadline);
  assert.equal(result.loudnessStatus, "unavailable");
  assert.equal(result.integratedLufs, null);
  assert.equal((await (await context.admin("/admin/loudness", context.json({}))).json()).queued, 0);
});

test("legacy backfill queue is bounded and never resets catalog metadata or original files", async (t) => {
  const context = await fixture(t, (directory) => readyCatalog(directory, { count: 14 }), { ffmpeg: "missing-ffmpeg-test-command" });
  const before = await fsp.readFile(path.join(context.directory, "dubplates", "assets", fixtureId(1001), "audio.wav"));
  const response = await (await context.admin("/admin/loudness", context.json({}))).json();
  assert.equal(response.queued, 12);
  assert.equal(response.pending, 2);
  assert.equal(response.queuedIds.length, 12);
  const until = Date.now() + 10000;
  for (;;) {
    const track = (await (await context.admin("/admin/tracks")).json()).tracks[11];
    if (track.loudnessStatus === "error") break;
    if (Date.now() > until) throw new Error("Test backfill did not drain");
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  const tracks = (await (await context.admin("/admin/tracks")).json()).tracks;
  assert.equal(tracks.length, 14);
  assert.ok(tracks.every((track) => track.assetStatus === "ready" && track.rating === 8.5 && track.productionStage === "mixed"));
  assert.deepEqual(await fsp.readFile(path.join(context.directory, "dubplates", "assets", fixtureId(1001), "audio.wav")), before);
});

test("measurement-only EBU R128 validates mono/stereo, whole-file gating and honest null cases", async (t) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "muvs-lufs-parity-"));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const mono = wavFixture(2);
  const stereo = Buffer.alloc(44 + (mono.length - 44) * 2);
  mono.copy(stereo, 0, 0, 44);
  stereo.writeUInt32LE(stereo.length - 8, 4);
  stereo.writeUInt16LE(2, 22);
  stereo.writeUInt32LE(44100 * 4, 28);
  stereo.writeUInt16LE(4, 32);
  stereo.writeUInt32LE(stereo.length - 44, 40);
  for (let source = 44, target = 44; source < mono.length; source += 2, target += 4) {
    const sample = mono.readInt16LE(source);
    stereo.writeInt16LE(sample, target);
    stereo.writeInt16LE(-sample, target + 2);
  }
  const silent = wavFixture(2); silent.fill(0, 44);
  const quiet = wavFixture(2);
  for (let offset = 44; offset < quiet.length; offset += 2) quiet.writeInt16LE(Math.round(quiet.readInt16LE(offset) / 24000), offset);
  const lowRate = wavFixture(6, 8000);
  lowRate.copy(lowRate, 44 + (lowRate.length - 44) / 2, 44, 44 + (lowRate.length - 44) / 2);
  for (const [name, bytes, measurable] of [
    ["mono", mono, true], ["stereo-opposite-phase", stereo, true],
    ["low-rate-constant", lowRate, true], ["silent", silent, false],
    ["short", wavFixture(0.1), false], ["below-absolute-gate", quiet, false],
  ]) {
    const filename = path.join(directory, `${name}.wav`);
    await fsp.writeFile(filename, bytes);
    const reference = spawnSync(ffmpeg, ["-nostdin", "-hide_banner", "-nostats", "-loglevel", "info",
      "-threads", "1", "-filter_threads", "1", "-protocol_whitelist", "file,pipe", "-f", "wav", "-i", filename,
      "-map", "0:a:0", "-vn", "-sn", "-dn", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-threads", "1", "-f", "null", "-"], { encoding: "utf8" });
    assert.equal(reference.status, 0, name);
    const printed = reference.stderr.match(/"input_i"\s*:\s*"([^"]+)"/)?.[1];
    const old = printed === "-inf" ? null : Number(printed);
    const measured = await analyzeLoudness(ffmpeg, "wav", filename);
    if (measurable) {
      assert.ok(Number.isFinite(measured) && Number.isFinite(old), name);
      if (name === "low-rate-constant") {
        // Native low-rate K-weighting and loudnorm's 192k resampled meter need
        // not be identical; keep scanning the real input rather than the 8k
        // waveform proxy or changing channels/sample rate to match a normalizer.
        assert.ok(Math.abs(measured - (-6.2)) <= 0.20001, `${name}: ebur=${measured}`);
      } else assert.ok(Math.abs(measured - old) <= 0.10001, `${name}: ebur=${measured}, loudnorm=${old}`);
    } else {
      assert.equal(old, null, `${name} reference is unmeasurable`);
      assert.equal(measured, null, `${name} must not become a fabricated -70 LUFS`);
    }
    assert.deepEqual(await fsp.readFile(filename), bytes, `${name} original unchanged`);
  }
  // Normalizers with lookahead can feed their buffered tail into their input
  // meter again during flushing. A measurement-only scan must instead weight
  // this original six-second, two-level signal once, not over-weight its quiet tail.
  const stepped = wavFixture(6);
  const filename = path.join(directory, "whole-file-level-step.wav");
  await fsp.writeFile(filename, stepped);
  assert.equal(await analyzeLoudness(ffmpeg, "wav", filename), -9);
  assert.deepEqual(await fsp.readFile(filename), stepped);
});
