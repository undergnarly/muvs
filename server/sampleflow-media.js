const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const ffmpegStatic = require("ffmpeg-static");

const jobs = new Map();
const failures = new Map();

const isAllowedYoutubeUrl = (value) => {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol)
      && /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname);
  } catch {
    return false;
  }
};

const run = (command, args, timeout = 30 * 60_000) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    reject(new Error(`${path.basename(command)} timed out`));
  }, timeout);
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (stdout.length > 5_000_000) stdout = stdout.slice(-5_000_000);
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (stderr.length > 100_000) stderr = stderr.slice(-100_000);
  });
  child.on("error", (error) => {
    clearTimeout(timer);
    reject(error);
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    if (code === 0) resolve({ stdout, stderr });
    else reject(new Error(stderr.trim().split("\n").slice(-8).join("\n") || `${path.basename(command)} exited with ${code}`));
  });
});

const version = async (command, flag) => {
  try {
    const result = await run(command, [flag], 10_000);
    return (result.stdout || result.stderr).trim().split("\n")[0];
  } catch {
    return null;
  }
};

module.exports = function createSampleflowMediaRouter({ dataDir }) {
  const router = express.Router();
  const mediaDir = path.join(dataDir, "sampleflow-media");
  const ytDlp = process.env.YT_DLP_PATH || path.join(__dirname, "tools", "yt-dlp");
  const ffmpeg = process.env.FFMPEG_PATH || ffmpegStatic;
  fs.mkdirSync(mediaDir, { recursive: true });

  router.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", process.env.SAMPLEFLOW_CORS_ORIGIN || "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Range");
    res.set("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  router.get("/health", async (_req, res) => {
    const [ytDlpVersion, ffmpegVersion] = await Promise.all([
      version(ytDlp, "--version"),
      version(ffmpeg, "-version"),
    ]);
    res.status(ytDlpVersion && ffmpegVersion ? 200 : 503).json({
      status: ytDlpVersion && ffmpegVersion ? "ready" : "missing-tools",
      ytDlp: ytDlpVersion,
      ffmpeg: ffmpegVersion,
      activeJobs: jobs.size,
    });
  });

  router.get("/media/:filename", async (req, res) => {
    if (!/^[a-f0-9]{20}\.mp4$/.test(req.params.filename)) return res.status(404).json({ error: "Not found" });
    const filePath = path.join(mediaDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });
    const info = await fsp.stat(filePath);
    const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "");
    if (req.headers.range && !match) return res.status(416).json({ error: "Invalid range" });
    const start = match ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
    if (start > end || start >= info.size) return res.status(416).json({ error: "Invalid range" });
    res.status(match ? 206 : 200).set({
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Content-Length": String(end - start + 1),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(match ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}),
    });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  });

  router.post("/import", async (req, res) => {
    const { url, start, end } = req.body || {};
    if (!isAllowedYoutubeUrl(url)) return res.status(400).json({ error: "Only single YouTube video URLs are accepted" });
    const clipStart = Number.isFinite(Number(start)) ? Math.max(0, Number(start)) : null;
    const clipEnd = Number.isFinite(Number(end)) ? Math.max(0, Number(end)) : null;
    if ((clipStart !== null || clipEnd !== null)
      && (clipStart === null || clipEnd === null || clipEnd <= clipStart || clipEnd - clipStart > 900)) {
      return res.status(400).json({ error: "Clip bounds must describe up to 15 minutes" });
    }
    const clipToken = clipStart === null ? "full" : `${clipStart}-${clipEnd}`;
    const id = crypto.createHash("sha256").update(`${url}|${clipToken}`).digest("hex").slice(0, 20);
    const finalPath = path.join(mediaDir, `${id}.mp4`);
    const publicBase = (process.env.SAMPLEFLOW_MEDIA_PUBLIC_BASE
      || `${req.protocol}://${req.get("host")}/api/sampleflow`).replace(/\/$/, "");
    if (fs.existsSync(finalPath)) {
      return res.json({ id, assetUrl: `${publicBase}/media/${id}.mp4`, title: "Cached YouTube sample", duration: clipStart === null ? 0 : clipEnd - clipStart, sourceUrl: url, kind: "video", cached: true });
    }
    if (failures.has(id)) {
      const message = failures.get(id);
      failures.delete(id);
      return res.status(500).json({ error: message });
    }
    if (jobs.has(id)) return res.status(202).json({ id, status: "processing", retryAfter: 3 });
    try {
      const job = (async () => {
          const common = ["--js-runtimes", `node:${process.execPath}`, "--extractor-args", "youtube:player_client=default,-android_vr", "--no-playlist", "--no-warnings"];
          const probe = await run(ytDlp, [...common, "--dump-single-json", "--skip-download", url], 60_000);
          const metadata = JSON.parse(probe.stdout);
          if (metadata.duration && metadata.duration > 3 * 60 * 60) throw new Error("Videos longer than three hours are not accepted");
          const template = path.join(mediaDir, `${id}.source.%(ext)s`);
          for (const stale of (await fsp.readdir(mediaDir)).filter((name) => name.startsWith(`${id}.source.`))) {
            await fsp.rm(path.join(mediaDir, stale), { force: true });
          }
          const downloadArgs = [...common];
          downloadArgs.push("--max-filesize", "1G", "--ffmpeg-location", ffmpeg, "-f", "b[height<=720][ext=mp4]/bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]", "--merge-output-format", "mp4", "-o", template, url);
          await run(ytDlp, downloadArgs);
          const sourceName = (await fsp.readdir(mediaDir)).find((name) => name.startsWith(`${id}.source.`));
          if (!sourceName) throw new Error("yt-dlp finished without a media file");
          const sourcePath = path.join(mediaDir, sourceName);
          const tempPath = path.join(mediaDir, `${id}.processing.mp4`);
          try {
            const args = ["-y"];
            if (clipStart !== null && clipEnd !== null) args.push("-ss", String(clipStart), "-t", String(clipEnd - clipStart));
            args.push("-i", sourcePath, "-map", "0:v:0?", "-map", "0:a:0?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tempPath);
            await run(ffmpeg, args);
            await fsp.rename(tempPath, finalPath);
          } finally {
            await fsp.rm(sourcePath, { force: true });
            await fsp.rm(tempPath, { force: true });
          }
          return { id, assetUrl: `${publicBase}/media/${id}.mp4`, title: String(metadata.title || "YouTube sample").slice(0, 160), duration: clipStart === null ? Number(metadata.duration || 0) : clipEnd - clipStart, thumbnail: metadata.thumbnail || null, sourceUrl: url, kind: "video", cached: false };
        })();
      jobs.set(id, job);
      job.catch((error) => {
        failures.set(id, error instanceof Error ? error.message : "Media import failed");
        setTimeout(() => failures.delete(id), 5 * 60_000);
      }).finally(() => jobs.delete(id));
      return res.status(202).json({ id, status: "processing", retryAfter: 3 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Media import failed";
      return res.status(/too large|longer/.test(message) ? 413 : 500).json({ error: message });
    }
  });

  return router;
};

module.exports.isAllowedYoutubeUrl = isAllowedYoutubeUrl;
