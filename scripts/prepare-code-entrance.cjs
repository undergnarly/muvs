#!/usr/bin/env node
'use strict';

// Isolate original pixels rather than regenerating the visible marble/logo.
// A separately reviewed clean still is required to reveal the hidden forearm.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('../server/node_modules/sharp');
const SIZE = 1024;

// Visible lid boundary follows the foreground knee at the bottom. These paths
// are image-space mattes; all transparent exterior pixels retain source alpha.
const LID_PATH = 'M662 294 C656 293 653 297 650 303 L589 435 Q585 445 595 448 L613 447 C632 440 648 436 665 435 C683 435 701 441 713 445 Q718 444 722 435 L782 315 Q787 308 779 306 L665 295 Z';
const HAND_PATH = 'M411 429 C425 415 447 409 467 400 C488 391 509 395 531 406 C545 415 557 426 565 435 L559 440 L548 439 L538 435 L529 439 L519 433 L513 433 L516 440 L503 444 L481 443 L468 447 L444 451 L428 450 L414 442 Z';
const KNEE_PATH = 'M603 450 C624 441 644 434 663 435 C682 434 703 441 717 449 C733 462 743 488 748 513 L610 513 Z';

async function rasterMask(paths, expansion = 0) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">${paths.map(d => `<path d="${d}" fill="white" stroke="white" stroke-width="${expansion * 2}" stroke-linejoin="round"/>`).join('')}</svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().extractChannel(3).raw().toBuffer();
}

function isolate(rgba, mask) {
  if (rgba.length !== mask.length * 4) throw new Error('RGBA and matte dimensions differ.');
  const result = Buffer.from(rgba);
  for (let i = 0; i < mask.length; i++) result[i * 4 + 3] = Math.round(rgba[i * 4 + 3] * mask[i] / 255);
  return result;
}

function remove(rgba, mask) {
  if (rgba.length !== mask.length * 4) throw new Error('RGBA and matte dimensions differ.');
  const result = Buffer.from(rgba);
  for (let i = 0; i < mask.length; i++) result[i * 4 + 3] = Math.round(rgba[i * 4 + 3] * (255 - mask[i]) / 255);
  return result;
}

async function saveLayer(rgba, filename, clearInvisible = false) {
  const pixels = Buffer.from(rgba);
  if (clearInvisible) for (let i = 0; i < pixels.length; i += 4) if (!pixels[i + 3]) {
    pixels[i] = 0; pixels[i + 1] = 0; pixels[i + 2] = 0;
  }
  const encoded = await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .webp({ lossless: true, exact: true, effort: 6 }).toBuffer();
  const decoded = await sharp(encoded).ensureAlpha().raw().toBuffer();
  if (!decoded.equals(pixels)) throw new Error('Lossless layer roundtrip changed source pixels.');
  await fs.writeFile(filename, encoded, { flag: 'wx' });
}

function transferCleanPlate(original, cleanRgb, mask, width, height, shiftX = 1) {
  if (original.length !== width * height * 4 || cleanRgb.length !== width * height * 3 || mask.length !== width * height) throw new Error('Clean plate dimensions differ.');
  const result = Buffer.from(original);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (!mask[i]) continue;
    const j = (y * width + Math.max(0, Math.min(width - 1, x + shiftX))) * 3;
    const r = cleanRgb[j]; const g = cleanRgb[j + 1]; const b = cleanRgb[j + 2];
    // Reviewed plate has a uniform gray 125–128 background and pale marble.
    // Only this previously occluded patch is keyed; original silhouette elsewhere
    // is not derived from Flow. Unmatting avoids a baked gray edge on other tones.
    const luminance = (r + g + b) / 3;
    const cleanAlpha = Math.max(0, Math.min(1, (luminance - 133) / 28));
    const mix = mask[i] / 255;
    const a = original[i * 4 + 3] / 255 * (1 - mix);
    const c = cleanAlpha * mix;
    const totalAlpha = a + c;
    result[i * 4 + 3] = Math.round(totalAlpha * 255);
    if (!totalAlpha) continue;
    for (let channel = 0; channel < 3; channel++) {
      const unmatted = cleanAlpha ? Math.max(0, Math.min(255, (cleanRgb[j + channel] - 126 * (1 - cleanAlpha)) / cleanAlpha)) : 0;
      result[i * 4 + channel] = Math.round((original[i * 4 + channel] * a + unmatted * c) / totalAlpha);
    }
  }
  return result;
}

async function prepare({ original, out, clean }) {
  const metadata = await sharp(original).metadata();
  if (metadata.width !== SIZE || metadata.height !== SIZE || !metadata.hasAlpha) throw new Error('Expected original 1024-square RGBA code artwork.');
  const rgba = await sharp(original).ensureAlpha().raw().toBuffer();
  const lidMask = await rasterMask([LID_PATH]);
  const foregroundMask = await rasterMask([HAND_PATH, KNEE_PATH]);
  const lid = isolate(rgba, lidMask);
  const foreground = isolate(rgba, foregroundMask);
  // Clear a four-pixel rim as well, so the old stationary lid antialias fringe
  // does not remain floating in the background while the isolated lid moves.
  const clearMask = await rasterMask([LID_PATH], 4);
  let base = remove(rgba, clearMask);
  if (clean) {
    const cleanMeta = await sharp(clean).metadata();
    if (cleanMeta.width !== 1376 || cleanMeta.height !== 768) throw new Error('Expected reviewed 1376×768 Flow clean still.');
    const normalized = await sharp(clean).resize(1280, 720, { fit: 'fill' }).png().toBuffer();
    const cleanRgb = await sharp(normalized).extract({ left: 280, top: 0, width: 720, height: 720 })
      .resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
    base = transferCleanPlate(rgba, cleanRgb, clearMask, SIZE, SIZE);
  }
  let outsideMismatch = 0;
  for (let i = 0; i < clearMask.length; i++) if (!clearMask[i]) {
    for (let channel = 0; channel < 4; channel++) if (base[i * 4 + channel] !== rgba[i * 4 + channel]) outsideMismatch++;
  }
  if (outsideMismatch) throw new Error('Clean plate changed pixels outside the local lid-removal region.');
  await fs.mkdir(path.dirname(out), { recursive: true });
  const targets = { lid: `${out}-lid.webp`, foreground: `${out}-foreground.webp`, base: `${out}-${clean ? 'base' : 'base-unfilled-preview'}.webp`,
    report: path.resolve(__dirname, '../output/flow-muvs-v3', `${path.basename(out)}-qa.json`) };
  for (const filename of Object.values(targets)) {
    try { await fs.access(filename); throw new Error(`Refusing to overwrite: ${filename}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await saveLayer(lid, targets.lid, true);
  await saveLayer(foreground, targets.foreground, true);
  await saveLayer(base, targets.base);
  const report = { original, clean: clean || null, dimensions: [SIZE, SIZE], outsideMismatch,
    lidAndForegroundRgb: 'Original RGB bytes wherever visible; fully transparent RGB cleared for compression. Lossless decoded pixel equality verified.',
    cleanPlate: clean ? { scope: 'Original lid removal region plus4px rim only', normalization: '1376×768→1280×720; centered720square→1024square', sampleShiftX: 1, backgroundRgb: 126, matteRamp: [133,161] } : null,
    warning: clean ? null : 'Base preview has the known hidden-forearm hole. Not a production base.' };
  await fs.writeFile(targets.report, JSON.stringify(report, null, 2), { flag: 'wx' });
  return { ...targets, ...report };
}

if (require.main === module) {
  prepare({ original: path.resolve(process.argv[2] || 'public/images/menu/code2.webp'), out: path.resolve(process.argv[3] || 'output/flow-muvs-v3/code-entrance'), clean: process.argv[4] ? path.resolve(process.argv[4]) : undefined })
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { rasterMask, isolate, remove, transferCleanPlate, LID_PATH, HAND_PATH, KNEE_PATH, prepare };
