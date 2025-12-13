const express = require('express');
const cors = require('cors');
const compression = require('compression');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3001;

// Paths to persistent data
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const AUDIO_UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'audio');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_UPLOADS_DIR)) fs.mkdirSync(AUDIO_UPLOADS_DIR, { recursive: true });

// Initialize DB if empty
if (!fs.existsSync(DB_FILE)) {
    const initialData = {
        releases: [],
        mixes: [],
        projects: [],
        news: [],
        adminSettings: { pin: '1234' }, // Default PIN
        stats: { visits: [], detailViews: [] }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' })); // Support large payloads
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// Image Storage Engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize filename and strip extension
        const name = file.originalname.toLowerCase().split(' ').join('-');
        const ext = path.extname(name);
        // Unique filename: timestamp-name
        cb(null, Date.now() + '-' + name);
    }
});
const upload = multer({ storage: storage });

// Audio Storage Engine
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AUDIO_UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const name = file.originalname.toLowerCase().split(' ').join('-');
        cb(null, Date.now() + '-' + name);
    }
});
const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid audio format. Only MP3 and WAV are allowed.'));
        }
    }
});

// Database Helper
const getDb = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading DB:', e);
        return {};
    }
};

const saveDb = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error writing DB:', e);
        return false;
    }
};

// --- Routes ---

// Get Data (All or Specific key)
app.get('/api/data', (req, res) => {
    const db = getDb();
    res.json(db);
});

// Update Data (Full update of a key)
app.post('/api/data', (req, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
        return res.status(400).json({ error: 'Missing key or value' });
    }

    const db = getDb();
    db[key] = value;

    if (saveDb(db)) {
        res.json({ success: true, count: Array.isArray(value) ? value.length : 1 });
    } else {
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Validate PIN (Server-side check)
app.post('/api/auth/validate-pin', (req, res) => {
    const { pin } = req.body;
    const db = getDb();
    const correctPin = db.adminSettings?.pin || '1234';

    if (pin === correctPin) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
});

// Upload File with Optimization
app.post('/api/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const originalPath = req.file.path;
        const filename = path.parse(req.file.filename).name; // Name without extension
        const webpFilename = `${filename}.webp`;
        const webpPath = path.join(UPLOADS_DIR, webpFilename);

        // Optimize: Resize to max 1600px width/height, Convert to WebP, 80% quality
        await sharp(originalPath)
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(webpPath);

        // Delete the original large file to save space (optional, but good for cleanup)
        // fs.unlinkSync(originalPath); 

        // Return URL for the optimized WebP
        const fileUrl = `/uploads/${webpFilename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Image processing error:', error);
        // Fallback to original if optimization fails
        res.json({ url: `/uploads/${req.file.filename}` });
    }
});

// Upload Audio File
app.post('/api/upload-audio', audioUpload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });
    }

    // Return relative URL that Nginx will map to the file
    const fileUrl = `/uploads/audio/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Start Server
app.listen(PORT, '127.0.0.1', () => { // Bind to localhost only for security
    console.log(`Server running at http://127.0.0.1:${PORT}`);
});
