"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ID = /^[a-f0-9]{32}$/;
const DEDUPE_MS = 30 * 60_000;
const MAX_RECENT = 100;
const MAX_DEDUPE = 5000;
const MAX_TRACKS = 2000;
const emptyCounts = () => ({ downloads: 0, listens: 0, mp3: 0, wav: 0, lastDownloadedAt: null, lastListenedAt: null });
const validCount = (value) => Number.isSafeInteger(value) && value >= 0;

// No visitor identity, IP address or user agent is written to disk. Session dedupe
// is bounded, short-lived memory only; it is not a visitor-tracking database.
function createAnalytics(filename, { now = Date.now } = {}) {
  let state = { version: 1, since: new Date(now()).toISOString(), tracks: {}, recentDownloads: [] };
  const existing = fs.existsSync(filename);
  if (existing) {
    state = JSON.parse(fs.readFileSync(filename, "utf8"));
    if (state.version !== 1 || !Number.isFinite(Date.parse(state.since)) || !state.tracks
        || typeof state.tracks !== "object" || Array.isArray(state.tracks)
        || Object.keys(state.tracks).length > MAX_TRACKS || !Array.isArray(state.recentDownloads)
        || state.recentDownloads.length > MAX_RECENT
        || !state.recentDownloads.every((event) => event && Number.isFinite(Date.parse(event.at))
          && ["mp3", "wav"].includes(event.format) && ["zip", "file"].includes(event.delivery)
          && Array.isArray(event.trackIds) && event.trackIds.length >= 1 && event.trackIds.length <= 50
          && event.trackIds.every((id) => typeof id === "string" && ID.test(id)))
        || !Object.entries(state.tracks).every(([id, value]) => ID.test(id) && value
          && ["downloads", "listens", "mp3", "wav"].every((key) => validCount(value[key])))) {
      throw new Error("Dubplates analytics are invalid; restore a backup before starting.");
    }
  }
  const sessions = new Map();
  const salt = crypto.randomBytes(32);
  function save(next) {
    const temporary = path.join(path.dirname(filename), `.${path.basename(filename)}.${process.pid}.tmp`);
    try {
      fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
      fs.renameSync(temporary, filename);
      state = next;
    } catch (error) {
      try { fs.unlinkSync(temporary); } catch { /* No partial analytics replace the valid file. */ }
      throw error;
    }
  }
  function update(ids, field, extra) {
    const tracks = { ...state.tracks };
    const at = new Date(now()).toISOString();
    for (const id of ids) {
      if (!ID.test(id)) throw new Error("Invalid analytics track.");
      if (!tracks[id] && Object.keys(tracks).length >= MAX_TRACKS) throw new Error("Analytics track limit reached.");
      const counts = { ...(tracks[id] || emptyCounts()) };
      counts[field] = Math.min(Number.MAX_SAFE_INTEGER, counts[field] + 1);
      counts[field === "downloads" ? "lastDownloadedAt" : "lastListenedAt"] = at;
      if (extra?.format) counts[extra.format] = Math.min(Number.MAX_SAFE_INTEGER, counts[extra.format] + 1);
      tracks[id] = counts;
    }
    const recentDownloads = extra ? [{ at, format: extra.format, delivery: extra.delivery, trackIds: ids }, ...state.recentDownloads].slice(0, MAX_RECENT) : state.recentDownloads;
    save({ ...state, tracks, recentDownloads });
  }
  if (!existing) save(state);
  return {
    download(ids, format, delivery) {
      if (!["mp3", "wav"].includes(format) || !["zip", "file"].includes(delivery)) throw new Error("Invalid analytics download.");
      if (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every((id) => typeof id === "string" && ID.test(id))) throw new Error("Invalid analytics tracks.");
      update([...new Set(ids)], "downloads", { format, delivery });
    },
    listen(trackId, sessionId) {
      if (typeof trackId !== "string" || !ID.test(trackId) || typeof sessionId !== "string" || !ID.test(sessionId)) throw new Error("Invalid analytics event.");
      const timestamp = now();
      for (const [key, until] of sessions) if (until <= timestamp) sessions.delete(key);
      const key = crypto.createHmac("sha256", salt).update(`${trackId}:${sessionId}`).digest("hex");
      if (sessions.has(key)) return false;
      if (sessions.size >= MAX_DEDUPE) return false;
      update([trackId], "listens");
      sessions.set(key, timestamp + DEDUPE_MS);
      return true;
    },
    snapshot(tracks) {
      return {
        since: state.since,
        totals: Object.values(state.tracks).reduce((sum, value) => ({ downloads: sum.downloads + value.downloads, listens: sum.listens + value.listens }), { downloads: 0, listens: 0 }),
        tracks: tracks.map(({ id, title, artist }) => ({ id, title, artist, ...(state.tracks[id] || emptyCounts()) })),
        recentDownloads: state.recentDownloads.map((event) => ({ ...event, trackIds: [...event.trackIds] })),
      };
    },
  };
}

module.exports = { createAnalytics, DEDUPE_MS, MAX_RECENT, MAX_DEDUPE };
