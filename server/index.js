const express = require("express");
const cors = require("cors");
const compression = require("compression");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");

const app = express();
const PORT = 3001;
const MEDITATION_PASSWORD = process.env.MEDITATION_PROJECT_PASSWORD;
const MEDITATION_AUTH_SECRET =
  process.env.MEDITATION_AUTH_SECRET || MEDITATION_PASSWORD;

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value),
  );

const meditationToken = () =>
  crypto
    .createHmac("sha256", MEDITATION_AUTH_SECRET || "not-configured")
    .update("meditation-project-client")
    .digest("hex");

// Paths to persistent data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const AUDIO_UPLOADS_DIR = path.join(DATA_DIR, "uploads", "audio");
const IMAGE_PREVIEW_DIR = path.join(DATA_DIR, "image-previews");
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const MEDITATION_PROGRESS_FILE = path.join(
  DATA_DIR,
  "meditation-progress.json",
);
const MEDITATION_PROGRESS_TOKEN = process.env.MEDITATION_PROGRESS_TOKEN;

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_UPLOADS_DIR))
  fs.mkdirSync(AUDIO_UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(IMAGE_PREVIEW_DIR))
  fs.mkdirSync(IMAGE_PREVIEW_DIR, { recursive: true });

const previewJobs = new Map();
const previewExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

const nearestAllowedNumber = (value, fallback, allowed) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return allowed.reduce((nearest, candidate) => (
    Math.abs(candidate - parsed) < Math.abs(nearest - parsed)
      ? candidate
      : nearest
  ), fallback);
};

const resolvePreviewSource = (rawSource) => {
  try {
    const pathname = decodeURIComponent(
      new URL(String(rawSource || ""), "http://localhost").pathname,
    );
    const roots = [
      { prefix: "/uploads/", root: UPLOADS_DIR },
      { prefix: "/images/", root: path.join(PUBLIC_DIR, "images") },
    ];
    const match = roots.find(({ prefix }) => pathname.startsWith(prefix));
    if (!match || pathname.startsWith("/uploads/audio/")) return null;

    const relativePath = pathname.slice(match.prefix.length);
    const root = path.resolve(match.root);
    const sourcePath = path.resolve(root, relativePath);
    if (!relativePath || !sourcePath.startsWith(`${root}${path.sep}`)) return null;
    if (!previewExtensions.has(path.extname(sourcePath).toLowerCase())) return null;
    return { sourcePath, identity: pathname };
  } catch {
    return null;
  }
};

const ensureImagePreview = async (sourcePath, identity, width = 192, quality = 35) => {
  const stats = fs.statSync(sourcePath);
  const cacheKey = crypto
    .createHash("sha256")
    .update(`${identity}:${stats.size}:${stats.mtimeMs}:${width}:${quality}`)
    .digest("hex");
  const previewPath = path.join(IMAGE_PREVIEW_DIR, `${cacheKey}.webp`);
  if (fs.existsSync(previewPath)) return previewPath;
  if (previewJobs.has(previewPath)) return previewJobs.get(previewPath);

  const job = sharp(sourcePath, { failOn: "none" })
    .rotate()
    .resize(width, width, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toFile(previewPath)
    .then(() => previewPath)
    .finally(() => previewJobs.delete(previewPath));
  previewJobs.set(previewPath, job);
  return job;
};

// Initialize DB if empty
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    releases: [],
    mixes: [],
    projects: [],
    news: [],
    adminSettings: { pin: "1234" }, // Default PIN
    stats: { visits: [], detailViews: [] },
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "100mb" })); // Support large payloads
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

// Image Storage Engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitize filename and strip extension
    const name = file.originalname.toLowerCase().split(" ").join("-");
    const ext = path.extname(name);
    // Unique filename: timestamp-name
    cb(null, Date.now() + "-" + name);
  },
});
const upload = multer({ storage: storage });

// Audio Storage Engine
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AUDIO_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const name = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, Date.now() + "-" + name);
  },
});
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid audio format. Only MP3 and WAV are allowed."));
    }
  },
});

// Database Helper
const getDb = () => {
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading DB:", e);
    return {};
  }
};

const saveDb = (data) => {
  try {
    // Backup current DB before overwriting
    if (fs.existsSync(DB_FILE)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFile = path.join(BACKUP_DIR, "db-" + timestamp + ".json");
      fs.copyFileSync(DB_FILE, backupFile);

      // Rotate: keep only last 50 backups
      const backups = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("db-") && f.endsWith(".json"))
        .sort();
      while (backups.length > 50) {
        fs.unlinkSync(path.join(BACKUP_DIR, backups.shift()));
      }
    }

    // Atomic write: write to temp file first, then rename
    const tmpFile = DB_FILE + ".tmp";
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (e) {
    console.error("Error writing DB:", e);
    return false;
  }
};

// --- Routes ---

app.get("/api/image-preview.webp", async (req, res) => {
  const source = resolvePreviewSource(req.query.src);
  if (!source || !fs.existsSync(source.sourcePath)) {
    return res.status(404).json({ error: "Image not found" });
  }

  const width = nearestAllowedNumber(req.query.w, 192, [96, 160, 192, 256, 384, 512]);
  const quality = nearestAllowedNumber(req.query.q, 35, [25, 35, 50, 70]);
  try {
    const previewPath = await ensureImagePreview(
      source.sourcePath,
      source.identity,
      width,
      quality,
    );
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    return res.sendFile(previewPath);
  } catch (error) {
    console.error("Image preview error:", error);
    return res.status(500).json({ error: "Failed to create image preview" });
  }
});

app.get("/api/projects/meditation/auth", (req, res) => {
  if (!MEDITATION_PASSWORD || !MEDITATION_AUTH_SECRET) {
    return res
      .status(503)
      .json({
        authenticated: false,
        error: "Project access is not configured",
      });
  }
  const cookies = parseCookies(req.headers.cookie);
  res.json({ authenticated: cookies.meditation_access === meditationToken() });
});

app.post("/api/projects/meditation/auth", (req, res) => {
  if (!MEDITATION_PASSWORD || !MEDITATION_AUTH_SECRET) {
    return res
      .status(503)
      .json({ success: false, error: "Project access is not configured" });
  }
  const supplied = Buffer.from(String(req.body.password || ""));
  const expected = Buffer.from(MEDITATION_PASSWORD);
  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ success: false, error: "Неверный пароль" });
  }
  res.setHeader(
    "Set-Cookie",
    `meditation_access=${meditationToken()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
  );
  res.json({ success: true });
});

app.delete("/api/projects/meditation/auth", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "meditation_access=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
  );
  res.json({ success: true });
});

app.get("/api/projects/meditation/progress", (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  if (
    !MEDITATION_AUTH_SECRET ||
    cookies.meditation_access !== meditationToken()
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const progress = fs.existsSync(MEDITATION_PROGRESS_FILE)
      ? JSON.parse(fs.readFileSync(MEDITATION_PROGRESS_FILE, "utf8"))
      : { updatedAt: null, tasks: {}, activity: [] };
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: "Failed to read progress" });
  }
});

app.put("/api/projects/meditation/progress", (req, res) => {
  const supplied = String(req.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!MEDITATION_PROGRESS_TOKEN || supplied !== MEDITATION_PROGRESS_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const progress = req.body;
  if (
    !progress ||
    typeof progress.tasks !== "object" ||
    !Array.isArray(progress.activity)
  ) {
    return res.status(400).json({ error: "Invalid progress payload" });
  }
  const tmpFile = `${MEDITATION_PROGRESS_FILE}.tmp`;
  fs.writeFileSync(
    tmpFile,
    JSON.stringify(
      { ...progress, updatedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  fs.renameSync(tmpFile, MEDITATION_PROGRESS_FILE);
  res.json({ success: true });
});

// Get Data (All or Specific key)
app.get("/api/data", (req, res) => {
  const db = getDb();
  res.json(db);
});

// Update Data (Full update of a key)
app.post("/api/data", (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ error: "Missing key or value" });
  }

  const db = getDb();
  let nextValue = value;
  if (
    key === "siteSettings" &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    nextValue = { ...(db.siteSettings || {}), ...value };
    Object.entries(value).forEach(([settingKey, settingValue]) => {
      if (settingValue === null) delete nextValue[settingKey];
    });
  }
  db[key] = nextValue;

  if (saveDb(db)) {
    res.json({
      success: true,
      count: Array.isArray(nextValue) ? nextValue.length : 1,
    });
  } else {
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Validate PIN (Server-side check)
app.post("/api/auth/validate-pin", (req, res) => {
  const { pin } = req.body;
  const db = getDb();
  const correctPin = db.adminSettings?.pin || "1234";

  if (pin === correctPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid PIN" });
  }
});

// List all uploaded images
app.get("/api/uploads", (req, res) => {
  try {
    const imageExts = [".webp", ".jpg", ".jpeg", ".png", ".gif"];
    const files = fs
      .readdirSync(UPLOADS_DIR)
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return imageExts.includes(ext);
      })
      .map((f) => {
        const filePath = path.join(UPLOADS_DIR, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          url: `/uploads/${f}`,
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json(files);
  } catch (error) {
    console.error("Error listing uploads:", error);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

// Upload File with Optimization
app.post("/api/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const originalPath = req.file.path;
    const filename = path.parse(req.file.filename).name; // Name without extension
    const webpFilename = `${filename}.webp`;
    const webpPath = path.join(UPLOADS_DIR, webpFilename);

    // Optimize: Resize to max 1200px width/height, Convert to WebP, 90% quality (High Quality)
    await sharp(originalPath)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(webpPath);

    await ensureImagePreview(webpPath, `/uploads/${webpFilename}`).catch(
      (previewError) => console.error("Initial image preview error:", previewError),
    );

    // Delete the original large file to save space (optional, but good for cleanup)
    // fs.unlinkSync(originalPath);

    // Return URL for the optimized WebP and its size
    const fileUrl = `/uploads/${webpFilename}`;
    const stats = fs.statSync(webpPath);
    const fileSizeInKB = Math.round(stats.size / 1024);

    res.json({ url: fileUrl, size: `${fileSizeInKB}KB` });
  } catch (error) {
    console.error("Image processing error:", error);
    // Fallback to original if optimization fails
    res.json({ url: `/uploads/${req.file.filename}` });
  }
});

// Upload Audio File
app.post("/api/upload-audio", audioUpload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file uploaded" });
  }

  // Return relative URL that Nginx will map to the file
  const fileUrl = `/uploads/audio/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Start Server
app.listen(PORT, "127.0.0.1", () => {
  // Bind to localhost only for security
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
