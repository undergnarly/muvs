/* Mechanical size/format conversion only; visual edits are done by imagegen. */
const { createRequire } = require('node:module');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const sharp = createRequire(path.join(__dirname, '../server/package.json'))('sharp');

async function main() {
    const sources = process.argv.slice(2);
    if (sources.length !== 3) throw new Error('Usage: node scripts/prepare-radio-artwork.cjs modern.png oldschool.png y2k.png');
    const root = path.resolve(__dirname, '..');
    const records = [];
    for (const [index, key] of ['modern', 'oldschool', 'y2k'].entries()) {
        const original = await readFile(sources[index]);
        const metadata = await sharp(original).metadata();
        const stats = await sharp(original).stats();
        if (!metadata.hasAlpha || stats.isOpaque) throw new Error(`${key}: expected genuine transparency`);
        for (const [kind, width, quality, relative] of [
            ['poster', 768, 84, `public/images/radio/radio-${key}-v1.webp`],
            ['fallback', 192, 48, `src/assets/menu-fallback/radio-${key}-v1.webp`],
        ]) {
            const destination = path.join(root, relative);
            const bytes = await sharp(original).resize({ width, withoutEnlargement: true })
                .webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
            await mkdir(path.dirname(destination), { recursive: true });
            await writeFile(destination, bytes);
            const output = await sharp(bytes).metadata();
            records.push({ key, kind, file: relative, bytes: bytes.length, width: output.width,
                height: output.height, hasAlpha: output.hasAlpha,
                sha256: createHash('sha256').update(bytes).digest('hex'),
                sourceSha256: createHash('sha256').update(original).digest('hex') });
        }
    }
    console.log(JSON.stringify(records, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
