/* Mechanical size/format conversion only; visual edits are done by imagegen. */
const { createRequire } = require('node:module');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const sharp = createRequire(path.join(__dirname, '../server/package.json'))('sharp');

// Mechanical framing only: retain the generated pixels/alpha and use one
// uniform scale for the complete significant silhouette, antenna included.
async function frameFrontalArtwork(original) {
    const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let left = info.width, top = info.height, right = -1, bottom = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] < 16) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right < left || bottom < top) throw new Error('Frontal artwork has no visible alpha silhouette.');
    const guard = 2;
    const crop = { left: Math.max(0, left - guard), top: Math.max(0, top - guard),
        width: Math.min(info.width - 1, right + guard) - Math.max(0, left - guard) + 1,
        height: Math.min(info.height - 1, bottom + guard) - Math.max(0, top - guard) + 1 };
    const scale = 706 / Math.max(crop.width, crop.height);
    const width = Math.round(crop.width * scale), height = Math.round(crop.height * scale);
    const targetLeft = Math.round((768 - width) / 2);
    const targetTop = 738 - Math.round((bottom - crop.top + 1) * scale);
    const layer = await sharp(original).extract(crop).resize(width, height).png().toBuffer();
    const framed = await sharp({ create: { width: 768, height: 768, channels: 4, background: '#00000000' } })
        .composite([{ input: layer, left: targetLeft, top: targetTop }]).png().toBuffer();
    return { bytes: framed, framing: { sourceSize: [info.width, info.height], alphaThreshold: 16,
        sourceBounds: { left, top, right, bottom }, guard, crop, scale,
        resizedSize: [width, height], canvasSize: [768, 768], offset: [targetLeft, targetTop], footBaseline: 738 } };
}

async function main() {
    const args = process.argv.slice(2);
    const modernV2 = args[0] === '--modern-v2';
    const frontal = args[0] === '--frontal';
    const sources = modernV2 || frontal ? args.slice(1) : args;
    if (sources.length !== (modernV2 ? 1 : 3)) throw new Error('Usage: node scripts/prepare-radio-artwork.cjs [--frontal] modern.png oldschool.png y2k.png OR --modern-v2 modern.png');
    const keys = modernV2 ? ['modern'] : ['modern', 'oldschool', 'y2k'];
    const root = path.resolve(__dirname, '..');
    const records = [];
    for (const [index, key] of keys.entries()) {
        const original = await readFile(sources[index]);
        const metadata = await sharp(original).metadata();
        const stats = await sharp(original).stats();
        if (!metadata.hasAlpha || stats.isOpaque) throw new Error(`${key}: expected genuine transparency`);
        const prepared = frontal ? await frameFrontalArtwork(original) : { bytes: original };
        const version = frontal ? (key === 'modern' ? 'v3' : 'v2') : modernV2 ? 'v2' : 'v1';
        for (const [kind, width, quality, relative] of [
            ['poster', 768, 84, `public/images/radio/radio-${key}-${version}.webp`],
            ['fallback', 192, 48, `src/assets/menu-fallback/radio-${key}-${version}.webp`],
        ]) {
            const destination = path.join(root, relative);
            const bytes = await sharp(prepared.bytes).resize({ width, withoutEnlargement: true })
                .webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, bytes);
            const output = await sharp(bytes).metadata();
            records.push({ key, kind, file: relative, bytes: bytes.length, width: output.width,
                height: output.height, hasAlpha: output.hasAlpha,
                sha256: createHash('sha256').update(bytes).digest('hex'),
                sourceSha256: createHash('sha256').update(original).digest('hex'),
                ...(prepared.framing ? { framing: prepared.framing } : {}) });
        }
    }
    console.log(JSON.stringify(records, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
