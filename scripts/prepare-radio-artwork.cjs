/* Mechanical size/format conversion only; visual edits are done by imagegen. */
const { createRequire } = require('node:module');
const { mkdir, readFile, writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const sharp = createRequire(path.join(__dirname, '../server/package.json'))('sharp');

async function main() {
    const args = process.argv.slice(2);
    const modernV2 = args[0] === '--modern-v2';
    const sources = modernV2 ? args.slice(1) : args;
    if (sources.length !== (modernV2 ? 1 : 3)) throw new Error('Usage: node scripts/prepare-radio-artwork.cjs modern.png oldschool.png y2k.png OR --modern-v2 modern.png');
    const keys = modernV2 ? ['modern'] : ['modern', 'oldschool', 'y2k'];
    const version = modernV2 ? 'v2' : 'v1';
    const root = path.resolve(__dirname, '..');
    const records = [];
    for (const [index, key] of keys.entries()) {
        const original = await readFile(sources[index]);
        const metadata = await sharp(original).metadata();
        const stats = await sharp(original).stats();
        if (!metadata.hasAlpha || stats.isOpaque) throw new Error(`${key}: expected genuine transparency`);
        for (const [kind, width, quality, relative] of [
            ['poster', 768, 84, `public/images/radio/radio-${key}-${version}.webp`],
            ['fallback', 192, 48, `src/assets/menu-fallback/radio-${key}-${version}.webp`],
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
