// Reproducible byte-only optimization: keep originals, dimensions and exact
// lossless alpha; encode photographic RGB at WebP quality90 for delivery.
const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('../server/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const names = ['music-v3-poster', 'mixes-v4-decoded-poster', 'code-v4-decoded-poster', 'agents-v2-decoded-poster'];

async function main() {
    for (const name of names) {
        const source = path.join(root, 'public/videos/objects', `${name}.webp`);
        const target = path.join(root, 'public/videos/objects', `${name}-q90.webp`);
        const metadata = await sharp(source).metadata();
        const output = await sharp(source).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
        const oldAlpha = await sharp(source).extractChannel('alpha').raw().toBuffer();
        const newAlpha = await sharp(output).extractChannel('alpha').raw().toBuffer();
        const next = await sharp(output).metadata();
        if (!oldAlpha.equals(newAlpha) || metadata.width !== next.width || metadata.height !== next.height) {
            throw new Error(`Poster geometry/alpha changed: ${name}`);
        }
        await fs.writeFile(target, output);
        console.log(JSON.stringify({ name, before: (await fs.stat(source)).size, after: output.length,
            width: next.width, height: next.height, alphaIdentical: true }));
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
