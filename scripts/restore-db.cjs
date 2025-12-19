const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = process.argv[2] || './data/uploads';
const DB_FILE = process.argv[3] || './data/db.json';
const OUTPUT_FILE = './data/db.json.new';
const DRY_RUN = process.argv.includes('--dry-run');

const initialData = {
    releases: [],
    mixes: [],
    projects: [],
    news: [],
    adminSettings: { pin: '1234' },
    stats: { visits: [], detailViews: [], totalVisits: 0, daily: {}, pages: {}, sources: {} },
    messages: [],
    about: { title: "ABOUT", content: "", backgroundImage: "" },
    siteSettings: { siteName: "MUVS", siteDescription: "Audio • Visual • Code", socialLinks: {} }
};

async function reconstruct() {
    console.log(`Scanning uploads in: ${UPLOADS_DIR}`);

    if (!fs.existsSync(UPLOADS_DIR)) {
        console.error('Uploads directory not found!');
        return;
    }

    const files = fs.readdirSync(UPLOADS_DIR);
    const audio_dir = path.join(UPLOADS_DIR, 'audio');
    const audioFiles = fs.existsSync(audio_dir) ? fs.readdirSync(audio_dir) : [];

    const releasesMap = new Map();

    // Process images
    files.forEach(file => {
        if (file.endsWith('.webp') || file.endsWith('.png') || file.endsWith('.jpg')) {
            const parts = file.split('-');
            const timestamp = parts[0];
            if (timestamp.length >= 10 && !isNaN(timestamp)) {
                const id = parseInt(timestamp);
                let namePart = parts.slice(1).join('-').split('.')[0]
                    .replace(/_trans(_\d+)?$/, '')
                    .replace(/upload$/, '')
                    .replace(/-$/, '');

                if (!releasesMap.has(id)) {
                    releasesMap.set(id, {
                        id: id,
                        title: namePart ? (namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/-/g, ' ')) : "Unnamed Release",
                        artists: "Unknown Artist",
                        releaseDate: new Date(id).toISOString().split('T')[0],
                        coverImage: `/uploads/${file}`,
                        tracks: [],
                        description: "",
                        soundcloudUrl: "",
                        bandcampUrl: ""
                    });
                }
            }
        }
    });

    // Process audio
    audioFiles.forEach(file => {
        const parts = file.split('-');
        const timestamp = parts[0];
        if (timestamp.length >= 10 && !isNaN(timestamp)) {
            const id = parseInt(timestamp);
            let namePart = parts.slice(1).join('-').split('.')[0].replace(/-/g, ' ');

            let release = releasesMap.get(id);
            if (!release) {
                release = {
                    id: id,
                    title: namePart ? (namePart.charAt(0).toUpperCase() + namePart.slice(1)) : "Unnamed Track",
                    artists: "Unknown Artist",
                    releaseDate: new Date(id).toISOString().split('T')[0],
                    coverImage: "",
                    tracks: [{ title: namePart || "Track 1", url: `/uploads/audio/${file}` }],
                    description: "",
                    soundcloudUrl: "",
                    bandcampUrl: ""
                };
                releasesMap.set(id, release);
            } else {
                release.tracks.push({ title: namePart || "Track", url: `/uploads/audio/${file}` });
            }
        }
    });

    // Merge logic
    let db = { ...initialData };
    if (fs.existsSync(DB_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            db.about = existing.about || db.about;
            db.siteSettings = existing.siteSettings || db.siteSettings;
            db.adminSettings = existing.adminSettings || db.adminSettings;
            db.stats = existing.stats || db.stats;
            console.log('Merged existing site settings and stats.');
        } catch (e) {
            console.error('Error reading existing DB for merge:', e);
        }
    }

    db.releases = Array.from(releasesMap.values()).sort((a, b) => b.id - a.id);

    if (DRY_RUN) {
        console.log('DRY RUN Results:');
        console.log(`Total releases found: ${db.releases.length}`);
    } else {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2));
        console.log(`Reconstructed DB saved to ${OUTPUT_FILE}`);
    }
}

reconstruct();
