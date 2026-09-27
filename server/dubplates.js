"use strict";

const express = require("express");
const multer = require("multer");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const ffmpegStatic = require("ffmpeg-static");

const ID = /^[a-f0-9]{32}$/;
// Leave multipart headroom below Cloudflare's baseline 100 MB request limit.
const MAX_UPLOAD = 95 * 1024 * 1024;
const MAX_DURATION = 30 * 60;
const MAX_EXPORT = 1024 * 1024 * 1024;
const MAX_STORAGE = 10 * 1024 * 1024 * 1024;
const MAX_TRACKS = 2000;
const MAX_ASSETS = 2000;
const FORMAT_MIMES = { wav: "audio/wav", mp3: "audio/mpeg" };
const ERROR_PROCESSING = "Audio could not be processed. Upload a valid WAV or MP3, up to 30 minutes.";
const uuid = () => crypto.randomBytes(16).toString("hex");
const iso = () => new Date().toISOString();
const fail = (status, message) => Object.assign(new Error(message), { status });

function textField(body, key, maximum, required = false) {
  const value = body[key] ?? "";
  if (typeof value !== "string" || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw fail(400, `Invalid ${key}.`);
  }
  if (required && !value.trim()) throw fail(400, `${key} is required.`);
  return value.trim();
}

function validCover(value) {
  if (!value) return true;
  // Only existing site image paths, never arbitrary URLs, query strings or SVGs.
  if (!/^\/(uploads|images)\/[\p{L}\p{N}_\-./ ()@+]+\.(?:png|jpe?g|webp|gif|avif)$/iu.test(value)) return false;
  return !value.includes("..") && !value.includes("//") && !value.startsWith("/uploads/audio/");
}

function validateTrack(body, assets) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw fail(400, "Invalid track.");
  const track = {
    title: textField(body, "title", 160, true),
    artist: textField(body, "artist", 160),
    genre: textField(body, "genre", 80),
    musicalKey: textField(body, "musicalKey", 24),
    releaseTitle: textField(body, "releaseTitle", 160),
    notes: textField(body, "notes", 2000),
    releaseDate: textField(body, "releaseDate", 10),
    coverImage: textField(body, "coverImage", 500),
    type: body.type,
    published: body.published,
    assetId: body.assetId || null,
    bpm: body.bpm === "" || body.bpm == null ? null : Number(body.bpm),
  };
  if (!["dubplate", "release"].includes(track.type)) throw fail(400, "Choose Dubplate or Release.");
  if (typeof track.published !== "boolean") throw fail(400, "Invalid publication status.");
  if (track.bpm !== null && (!Number.isFinite(track.bpm) || track.bpm < 20 || track.bpm > 400)) {
    throw fail(400, "BPM must be between 20 and 400.");
  }
  if (track.releaseDate && (!/^\d{4}-\d{2}-\d{2}$/.test(track.releaseDate)
      || !Number.isFinite(Date.parse(`${track.releaseDate}T00:00:00Z`))
      || new Date(`${track.releaseDate}T00:00:00Z`).toISOString().slice(0, 10) !== track.releaseDate)) {
    throw fail(400, "Choose a valid release date.");
  }
  if (!validCover(track.coverImage)) throw fail(400, "Choose a local JPG, PNG, WEBP, GIF or AVIF cover.");
  if (track.assetId !== null && (typeof track.assetId !== "string" || !ID.test(track.assetId)
      || assets[track.assetId]?.status !== "ready")) throw fail(400, "Choose a successfully processed audio file.");
  if (track.published && !track.assetId) throw fail(400, "Audio is required before publishing.");
  return track;
}

function audioKind(header) {
  if (header.length >= 12 && ["RIFF", "RF64"].includes(header.toString("ascii", 0, 4))
      && header.toString("ascii", 8, 12) === "WAVE") return "wav";
  if (header.length >= 3 && (header.toString("ascii", 0, 3) === "ID3"
      || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0
        && (header[1] & 0x06) !== 0 && (header[2] & 0xf0) !== 0xf0))) return "mp3";
  return null;
}

function safeFilename(track, index, format) {
  const name = [track.artist, track.title].filter(Boolean).join(" - ").normalize("NFKC")
    .replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 120) || "Track";
  return `${String(index + 1).padStart(2, "0")} - ${name}.${format}`;
}

function peaksFromBins(bins, count = 256) {
  if (!bins.length) return [];
  const maximum = Math.max(...bins, 0.0001);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * bins.length / count);
    const end = Math.max(start + 1, Math.floor((index + 1) * bins.length / count));
    let peak = 0;
    for (let i = start; i < Math.min(end, bins.length); i += 1) peak = Math.max(peak, bins[i]);
    return Math.round(Math.min(1, peak / maximum) * 1000) / 1000;
  });
}

// A forced demuxer + protocol whitelist keeps uploaded files from becoming playlists or network requests.
function ffmpegInput(kind, source) {
  return ["-nostdin", "-hide_banner", "-loglevel", "error", "-threads", "1", "-protocol_whitelist", "file,pipe",
    "-f", kind, "-i", source, "-map", "0:a:0", "-vn", "-sn", "-dn", "-t", String(MAX_DURATION + 1)];
}

function runFfmpeg(executable, args, onChunk, timeoutMs = 10 * 60_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    let stopped = false;
    const timer = setTimeout(() => { stopped = true; child.kill("SIGKILL"); }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      try { if (onChunk) onChunk(chunk); }
      catch { stopped = true; child.kill("SIGKILL"); }
    });
    child.once("error", () => { clearTimeout(timer); reject(new Error(ERROR_PROCESSING)); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || stopped) reject(new Error(ERROR_PROCESSING));
      else resolve();
    });
  });
}

async function analyzeAudio(executable, kind, source) {
  const sampleRate = 8000;
  const bins = [];
  let sampleCount = 0;
  let currentPeak = 0;
  let pending = Buffer.alloc(0);
  await runFfmpeg(executable, [...ffmpegInput(kind, source), "-ac", "1", "-ar", String(sampleRate),
    "-c:a", "pcm_f32le", "-f", "f32le", "-threads", "1", "pipe:1"], (chunk) => {
    const data = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    const length = data.length - data.length % 4;
    for (let offset = 0; offset < length; offset += 4) {
      const sample = data.readFloatLE(offset);
      if (!Number.isFinite(sample)) throw new Error(ERROR_PROCESSING);
      currentPeak = Math.max(currentPeak, Math.abs(sample));
      sampleCount += 1;
      if (sampleCount % 800 === 0) { bins.push(currentPeak); currentPeak = 0; }
      if (sampleCount > sampleRate * (MAX_DURATION + 1)) throw new Error(ERROR_PROCESSING);
    }
    pending = Buffer.from(data.subarray(length));
  });
  if (sampleCount % 800) bins.push(currentPeak);
  const duration = sampleCount / sampleRate;
  if (duration < 0.1 || duration > MAX_DURATION) throw new Error(ERROR_PROCESSING);
  return { duration: Math.round(duration * 1000) / 1000, peaks: peaksFromBins(bins) };
}

module.exports = function createDubplatesRouter({ dataDir, requireAdmin, hasAdminSession, ffmpeg = ffmpegStatic }) {
  const router = express.Router();
  const root = path.resolve(dataDir, "dubplates");
  const assetRoot = path.join(root, "assets");
  const incoming = path.join(root, "incoming");
  const catalogFile = path.join(root, "catalog.json");
  fs.mkdirSync(assetRoot, { recursive: true });
  fs.mkdirSync(incoming, { recursive: true });
  const catalog = fs.existsSync(catalogFile)
    ? JSON.parse(fs.readFileSync(catalogFile, "utf8")) : { version: 1, tracks: [], assets: {} };
  if (catalog.version !== 1 || !Array.isArray(catalog.tracks) || !catalog.assets || typeof catalog.assets !== "object") {
    throw new Error("Dubplates catalog is invalid; restore a backup before starting.");
  }
  function persist() {
    const temp = `${catalogFile}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(catalog, null, 2), { mode: 0o600 });
    fs.renameSync(temp, catalogFile);
  }
  // A restart never re-runs partially written audio. Failed/aborted staging files are not published assets.
  for (const entry of fs.readdirSync(incoming)) {
    if (/^[a-f0-9]{32}\.upload$/.test(entry)) fs.unlinkSync(path.join(incoming, entry));
  }
  for (const [id, asset] of Object.entries(catalog.assets)) {
    if (ID.test(id) && asset.status === "processing") {
      asset.status = "error";
      asset.error = "Processing was interrupted. Please upload the audio again.";
      fs.rmSync(path.join(assetRoot, id), { recursive: true, force: true });
    }
  }
  persist();

  const queue = [];
  let processing = false;
  let uploadCount = 0;
  let activeExports = 0;
  let activeMedia = 0;
  const ipUploads = new Map();
  const ipExports = new Map();
  const ipMedia = new Map();
  const limits = new Map();
  const tickets = new Map();
  const assetPath = (id, format) => path.join(assetRoot, id, `audio.${format}`);

  router.use((_req, res, next) => {
    res.set({ "X-Robots-Tag": "noindex, nofollow, noarchive", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    next();
  });
  function rate(req, action, count, windowMs) {
    const now = Date.now();
    for (const [key, limit] of limits) if (limit.until <= now) limits.delete(key);
    const key = `${action}:${req.ip}`;
    if (!limits.has(key)) {
      if (limits.size >= 5000) throw fail(429, "Service is busy. Try again shortly.");
      limits.set(key, { count: 0, until: now + windowMs });
    }
    const limit = limits.get(key);
    if (++limit.count > count) throw fail(429, "Too many requests. Please try again later.");
  }
  function trackView(track, admin = false) {
    const asset = catalog.assets[track.assetId];
    const { assetId, deletedAt, ...metadata } = track;
    return {
      ...metadata,
      ...(admin ? { assetId: assetId || null, assetStatus: asset?.status || null } : {}),
      duration: asset?.status === "ready" ? asset.duration : 0,
      peaks: asset?.status === "ready" ? asset.peaks : [],
      formats: asset?.status === "ready" ? asset.formats : [],
      previewUrl: asset?.status === "ready" ? `/api/dubplates/tracks/${track.id}/audio/mp3` : null,
    };
  }
  const isPublished = (track) => !track.deletedAt && track.published && catalog.assets[track.assetId]?.status === "ready";
  function liveTrack(id) {
    if (!ID.test(id)) return null;
    return catalog.tracks.find((track) => track.id === id && !track.deletedAt);
  }
  function diskUsage(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, item) => {
      const itemPath = path.join(directory, item.name);
      return sum + (item.isDirectory() ? diskUsage(itemPath) : item.isFile() ? fs.statSync(itemPath).size : 0);
    }, 0);
  }
  async function drain() {
    if (processing) return;
    processing = true;
    try {
      while (queue.length) {
        const { id, kind } = queue.shift();
        const source = assetPath(id, kind);
        const asset = catalog.assets[id];
        try {
          const analysis = await analyzeAudio(ffmpeg, kind, source);
          if (kind === "wav") {
            const temp = path.join(assetRoot, id, "preview.processing.mp3");
            await runFfmpeg(ffmpeg, [...ffmpegInput(kind, source), "-map_metadata", "-1", "-c:a", "libmp3lame",
              "-b:a", "320k", "-ar", "44100", "-ac", "2", "-threads", "1", "-y", temp]);
            await fsp.rename(temp, assetPath(id, "mp3"));
          }
          Object.assign(asset, analysis, { status: "ready", formats: kind === "wav" ? ["wav", "mp3"] : ["mp3"], updatedAt: iso() });
          persist();
        } catch {
          await fsp.rm(path.join(assetRoot, id), { recursive: true, force: true });
          Object.assign(asset, { status: "error", error: ERROR_PROCESSING, updatedAt: iso() });
          persist();
        }
      }
    } finally { processing = false; }
  }

  router.get("/", (_req, res) => res.json({ tracks: catalog.tracks.filter(isPublished).map((track) => trackView(track)) }));
  router.get("/admin/tracks", requireAdmin, (_req, res) => res.json({ tracks: catalog.tracks.filter((track) => !track.deletedAt).map((track) => trackView(track, true)) }));

  const upload = multer({
    storage: multer.diskStorage({ destination: incoming, filename: (_req, _file, done) => done(null, `${uuid()}.upload`) }),
    limits: { fileSize: MAX_UPLOAD, files: 1, fields: 0, parts: 1, fieldNameSize: 100, headerPairs: 32 },
    fileFilter: (_req, file, done) => {
      const extension = path.extname(file.originalname).toLowerCase();
      const mime = file.mimetype.toLowerCase();
      const allowed = (extension === ".wav" && ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"].includes(mime))
        || (extension === ".mp3" && ["audio/mpeg", "audio/mp3", "audio/x-mpeg"].includes(mime));
      done(allowed ? null : fail(400, "Upload a WAV or MP3 audio file."), allowed);
    },
  }).single("audio");

  router.post("/admin/assets", requireAdmin, (req, res, next) => {
    try {
      rate(req, "upload", 30, 60 * 60_000);
      if (Number(req.get("content-length")) > MAX_UPLOAD + 1024 * 1024) throw fail(413, "Audio must be 95 MB or smaller.");
      if (uploadCount >= 2 || ipUploads.has(req.ip) || queue.length >= 4
          || Object.keys(catalog.assets).length >= MAX_ASSETS) throw fail(429, "Audio queue is full. Please try again later.");
      if (diskUsage(root) + (uploadCount + 1) * MAX_UPLOAD * 2 > MAX_STORAGE) throw fail(507, "Audio storage is full. Contact the site owner.");
    } catch (error) { return next(error); }
    uploadCount += 1;
    ipUploads.set(req.ip, true);
    upload(req, res, async (error) => {
      let stagedId;
      let queued = false;
      try {
        if (error) throw error;
        if (!req.file) throw fail(400, "Choose an audio file.");
        if (req.aborted) throw fail(400, "Upload interrupted.");
        const header = Buffer.alloc(12);
        const source = await fsp.open(req.file.path, "r");
        try { await source.read(header, 0, 12, 0); } finally { await source.close(); }
        const kind = audioKind(header);
        if (!kind || `.${kind}` !== path.extname(req.file.originalname).toLowerCase()) throw fail(400, "Audio contents do not match the file type.");
        const id = uuid();
        stagedId = id;
        await fsp.mkdir(path.join(assetRoot, id));
        await fsp.rename(req.file.path, assetPath(id, kind));
        catalog.assets[id] = { id, status: "processing", createdAt: iso(), updatedAt: iso(), formats: [] };
        persist();
        queue.push({ id, kind });
        queued = true;
        void drain().catch(() => { /* Do not expose filesystem errors or leave unhandled rejections. */ });
        res.status(202).json({ id, status: "processing" });
      } catch (err) {
        if (req.file?.path) await fsp.rm(req.file.path, { force: true }).catch(() => {});
        if (stagedId && !queued) {
          delete catalog.assets[stagedId];
          await fsp.rm(path.join(assetRoot, stagedId), { recursive: true, force: true }).catch(() => {});
        }
        next(err);
      } finally {
        uploadCount -= 1;
        ipUploads.delete(req.ip);
      }
    });
  });
  router.get("/admin/assets/:id", requireAdmin, (req, res) => {
    const asset = ID.test(req.params.id) ? catalog.assets[req.params.id] : null;
    if (!asset) return res.status(404).json({ error: "Audio not found." });
    const { id, status, error, duration, peaks, formats } = asset;
    return res.json({ id, status, ...(error ? { error } : {}), ...(status === "ready" ? { duration, peaks, formats } : {}) });
  });
  router.post("/admin/tracks", requireAdmin, (req, res) => {
    if (catalog.tracks.length >= MAX_TRACKS) throw fail(409, "Track limit reached. Contact the site owner.");
    const metadata = validateTrack(req.body, catalog.assets);
    const track = { id: uuid(), ...metadata, createdAt: iso(), updatedAt: iso() };
    catalog.tracks.push(track);
    try { persist(); } catch (error) { catalog.tracks.pop(); throw error; }
    res.status(201).json({ track: trackView(track, true) });
  });
  router.put("/admin/tracks/:id", requireAdmin, (req, res) => {
    const track = liveTrack(req.params.id);
    if (!track) throw fail(404, "Track not found.");
    const previous = { ...track };
    Object.assign(track, validateTrack(req.body, catalog.assets), { updatedAt: iso() });
    try { persist(); } catch (error) { Object.assign(track, previous); throw error; }
    res.json({ track: trackView(track, true) });
  });
  router.delete("/admin/tracks/:id", requireAdmin, (req, res) => {
    const track = liveTrack(req.params.id);
    if (!track) throw fail(404, "Track not found.");
    // Soft deletion preserves the original and metadata for manual recovery from the catalog.
    const previous = { ...track };
    Object.assign(track, { deletedAt: iso(), published: false, updatedAt: iso() });
    try { persist(); } catch (error) { delete track.deletedAt; Object.assign(track, previous); throw error; }
    res.sendStatus(204);
  });

  router.get("/tracks/:id/audio/:format", (req, res, next) => {
    const track = liveTrack(req.params.id);
    const format = req.params.format;
    if (!track || (!isPublished(track) && !hasAdminSession(req))
        || !["wav", "mp3"].includes(format) || !catalog.assets[track.assetId]?.formats?.includes(format)) {
      return res.status(404).json({ error: "Audio not found." });
    }
    if (activeMedia >= 12 || (ipMedia.get(req.ip) || 0) >= 4) return res.status(429).json({ error: "Too many audio streams. Try again shortly." });
    activeMedia += 1;
    ipMedia.set(req.ip, (ipMedia.get(req.ip) || 0) + 1);
    res.once("close", () => {
      activeMedia -= 1;
      const count = (ipMedia.get(req.ip) || 1) - 1;
      if (count) ipMedia.set(req.ip, count); else ipMedia.delete(req.ip);
    });
    res.type(FORMAT_MIMES[format]);
    res.setTimeout(15 * 60_000, () => res.destroy());
    return res.sendFile(assetPath(track.assetId, format), { cacheControl: false, lastModified: false, acceptRanges: true }, (err) => {
      if (err && !res.headersSent) next(fail(err.status === 416 ? 416 : 404, "Audio unavailable."));
    });
  });

  function exportTracks(ids, format) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 50 || new Set(ids).size !== ids.length
        || !ids.every((id) => typeof id === "string" && ID.test(id)) || !["mp3", "wav"].includes(format)) {
      throw fail(400, "Select 1–50 tracks and choose MP3 or WAV.");
    }
    let total = 0;
    return ids.map((id) => {
      const track = liveTrack(id);
      if (!track || !isPublished(track)) throw fail(404, "A selected track is no longer available.");
      if (!catalog.assets[track.assetId].formats.includes(format)) throw fail(409, "WAV is unavailable for one or more selected tracks. Choose MP3 or adjust the selection.");
      const filename = assetPath(track.assetId, format);
      let size;
      try { size = fs.statSync(filename).size; } catch { throw fail(404, "A selected audio file is unavailable."); }
      total += size;
      if (total > MAX_EXPORT) throw fail(413, "The selection exceeds 1 GB. Export fewer tracks at a time.");
      return { track, filename };
    });
  }
  router.post("/exports", (req, res) => {
    rate(req, "export", 8, 60_000);
    const { ids, format } = req.body || {};
    exportTracks(ids, format);
    for (const [id, ticket] of tickets) if (ticket.expires <= Date.now()) tickets.delete(id);
    if (tickets.size >= 500) throw fail(429, "Export queue is full. Try again shortly.");
    const id = crypto.randomBytes(24).toString("hex");
    const expires = Date.now() + 5 * 60_000;
    tickets.set(id, { ids, format, expires, ip: req.ip });
    res.json({ downloadUrl: `/api/dubplates/exports/${id}`, expiresAt: new Date(expires).toISOString() });
  });
  router.get("/exports/:ticket", async (req, res) => {
    const ticket = /^[a-f0-9]{48}$/.test(req.params.ticket) && tickets.get(req.params.ticket);
    if (!ticket || ticket.expires < Date.now() || ticket.ip !== req.ip) throw fail(404, "Download expired. Please export again.");
    exportTracks(ticket.ids, ticket.format);
    if (activeExports >= 2 || ipExports.has(req.ip)) throw fail(429, "Another export is running. Try again shortly.");
    const { ZipArchive } = await import("archiver");
    // Import can yield: re-check before reserving an export slot.
    if (!tickets.has(req.params.ticket) || ticket.expires < Date.now()) throw fail(404, "Download expired. Please export again.");
    if (activeExports >= 2 || ipExports.has(req.ip)) throw fail(429, "Another export is running. Try again shortly.");
    const entries = exportTracks(ticket.ids, ticket.format);
    activeExports += 1;
    ipExports.set(req.ip, true);
    tickets.delete(req.params.ticket);
    const archive = new ZipArchive({ store: true });
    res.setTimeout(15 * 60_000, () => res.destroy());
    res.status(200).set({ "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="MUVS-Dubplates-${ticket.format.toUpperCase()}.zip"` });
    res.once("close", () => {
      activeExports -= 1;
      ipExports.delete(req.ip);
      archive.abort();
    });
    archive.once("error", () => res.destroy());
    archive.on("warning", () => res.destroy());
    archive.pipe(res);
    entries.forEach(({ track, filename }, index) => archive.file(filename, { name: safeFilename(track, index, ticket.format) }));
    void archive.finalize().catch(() => res.destroy());
  });
  router.use((error, _req, res, _next) => {
    if (res.headersSent) return res.destroy();
    if (error instanceof multer.MulterError) {
      return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "Audio must be 95 MB or smaller." : "Upload exactly one WAV or MP3 file." });
    }
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500;
    if (status === 429) res.set("Retry-After", "60");
    return res.status(status).json({ error: status === 500 ? "Dubplates is temporarily unavailable. Please try again." : error.message });
  });
  return router;
};

module.exports.validateTrack = validateTrack;
module.exports.validCover = validCover;
module.exports.audioKind = audioKind;
module.exports.safeFilename = safeFilename;
module.exports.peaksFromBins = peaksFromBins;
module.exports.analyzeAudio = analyzeAudio;
