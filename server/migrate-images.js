const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

async function processImage(url) {
    if (!url || !url.startsWith('/uploads/')) return url;

    // Check if it's already webp
    if (url.endsWith('.webp')) return url;

    const filename = path.basename(url);
    const originalPath = path.join(UPLOADS_DIR, filename);
    const nameWithoutExt = path.parse(filename).name;
    const webpFilename = `${nameWithoutExt}.webp`;
    const webpPath = path.join(UPLOADS_DIR, webpFilename);

    if (!fs.existsSync(originalPath)) {
        console.warn(`File not found: ${originalPath}`);
        return url;
    }

    try {
        console.log(`Converting ${filename} to WebP...`);
        await sharp(originalPath)
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(webpPath);

        return `/uploads/${webpFilename}`;
    } catch (e) {
        console.error(`Failed to convert ${filename}:`, e);
        return url;
    }
}

async function migrate() {
    console.log('Starting migration...');
    let changes = 0;

    // Migrate Releases
    if (db.releases) {
        for (const r of db.releases) {
            const newCover = await processImage(r.coverImage);
            if (newCover !== r.coverImage) {
                r.coverImage = newCover;
                changes++;
            }
        }
    }

    // Migrate Mixes
    if (db.mixes) {
        for (const m of db.mixes) {
            const newBg = await processImage(m.backgroundImage);
            if (newBg !== m.backgroundImage) {
                m.backgroundImage = newBg;
                changes++;
            }
        }
    }

    // Migrate Projects
    if (db.projects) {
        for (const p of db.projects) {
            const newThumb = await processImage(p.thumbnail);
            if (newThumb !== p.thumbnail) {
                p.thumbnail = newThumb;
                changes++;
            }
        }
    }

    if (changes > 0) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        console.log(`Migration complete. Updated ${changes} records.`);
    } else {
        console.log('No changes needed.');
    }
}

migrate();
