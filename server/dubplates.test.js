"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const createRouter = require("./dubplates");
const { validateTrack, validCover, audioKind, safeFilename, peaksFromBins } = createRouter;

const trackInput = (extra = {}) => ({
  title: "Shanti Roko", artist: "MUVS", genre: "Dub", bpm: 140,
  musicalKey: "Dm", releaseTitle: "Veiled", type: "dubplate", releaseDate: "2026-09-27",
  coverImage: "/images/cover.webp", notes: "For friends", published: false, assetId: null, ...extra,
});

async function fixture(t, before) {
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
  app.use("/api/dubplates", createRouter({ dataDir: directory, hasAdminSession, requireAdmin }));
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

function wavFixture(duration = 0.3) {
  const rate = 44100;
  const count = Math.round(duration * rate);
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF", 0); data.writeUInt32LE(data.length - 8, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24); data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index += 1) data.writeInt16LE(Math.round(Math.sin(index * 2 * Math.PI * 440 / rate) * (index < count / 2 ? 24000 : 8000)), 44 + index * 2);
  return data;
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
  assert.match(safeFilename({ artist: "../../CON", title: "<bad>|../../Title" }, 0, "mp3"), /^01 - CON - badTitle\.mp3$/);
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
  assert.ok(zip.includes(Buffer.from("01 - MUVS - Shanti Roko.mp3")));
  assert.ok(zip.includes(Buffer.from("02 - MUVS - MP3 only.mp3")));
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
