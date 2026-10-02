#!/usr/bin/env node
'use strict';

// Transfer only the two removed left reptiles from Flow's clean still. Geometry,
// the remaining right reptile, invisible RGB and every alpha byte stay original.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('../server/node_modules/sharp');

const SIZE = 1024;
const FEATHER = 6;
const POLYGONS = [
  [[179,597],[191,590],[211,592],[223,608],[228,617],[241,619],[243,634],[231,641],[235,655],[229,672],[213,680],[192,685],[178,674],[167,651],[170,620]],
  [[233,668],[248,674],[258,695],[250,719],[260,732],[259,743],[244,745],[237,757],[222,764],[199,790],[186,794],[185,782],[199,757],[204,739],[199,731],[207,715],[221,715],[229,701],[225,690]],
];

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i]; const [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function edgeDistance(x, y, polygon) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i]; const [bx, by] = polygon[(i + 1) % polygon.length];
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
    distance = Math.min(distance, Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)));
  }
  return distance;
}

function makeMask(width, height, polygons = POLYGONS, feather = FEATHER) {
  const mask = new Float32Array(width * height);
  for (const polygon of polygons) {
    const left = Math.max(0, Math.floor(Math.min(...polygon.map(p => p[0])) - feather));
    const right = Math.min(width - 1, Math.ceil(Math.max(...polygon.map(p => p[0])) + feather));
    const top = Math.max(0, Math.floor(Math.min(...polygon.map(p => p[1])) - feather));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(...polygon.map(p => p[1])) + feather));
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      const d = pointInPolygon(x, y, polygon) ? 0 : edgeDistance(x, y, polygon);
      const t = Math.max(0, 1 - d / feather);
      mask[y * width + x] = Math.max(mask[y * width + x], t * t * (3 - 2 * t));
    }
  }
  return mask;
}

function gradient(rgb, channels, width, height) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = rgb[i * channels] * 0.2126 + rgb[i * channels + 1] * 0.7152 + rgb[i * channels + 2] * 0.0722;
  const result = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    result[i] = Math.hypot(gray[i + 1] - gray[i - 1], gray[i + width] - gray[i - width]);
  }
  return result;
}

function alignPatch(original, candidate, width, height) {
  const a = gradient(original, 4, width, height); const b = gradient(candidate, 3, width, height);
  const excluded = makeMask(width, height, POLYGONS, 16);
  const points = [];
  // Register against nearby unchanged carved borders, not removed creatures.
  for (let y = 578; y < 824; y += 2) for (let x = 155; x < 310; x += 2) {
    const i = y * width + x;
    if (!excluded[i] && original[i * 4 + 3] === 255 && a[i] > 12) points.push(i);
  }
  let best = { dx: 0, dy: 0, correlation: -1 };
  for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
    let dot = 0; let aa = 0; let bb = 0;
    for (const i of points) { const v = b[i + dy * width + dx]; dot += a[i] * v; aa += a[i] ** 2; bb += v ** 2; }
    const correlation = dot / Math.sqrt(aa * bb || 1);
    if (correlation > best.correlation) best = { dx, dy, correlation };
  }
  return best;
}

function composite(original, candidate, mask, width, height, shift = { dx: 0, dy: 0 }) {
  if (original.length !== width * height * 4 || candidate.length !== width * height * 3 || mask.length !== width * height) throw new Error('Invalid compositor dimensions.');
  const result = Buffer.from(original);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x; const weight = mask[i];
    if (!weight || original[i * 4 + 3] === 0) continue;
    const sx = x + shift.dx; const sy = y + shift.dy;
    if (sx < 0 || sx >= width || sy < 0 || sy >= height) throw new Error('Aligned patch leaves source bounds.');
    const source = (sy * width + sx) * 3;
    for (let c = 0; c < 3; c++) result[i * 4 + c] = Math.round(original[i * 4 + c] * (1 - weight) + candidate[source + c] * weight);
  }
  return result;
}

function verify(original, output, mask) {
  let alphaMismatch = 0; let outsideMismatch = 0; let changedPixels = 0;
  for (let i = 0; i < mask.length; i++) {
    if (original[i * 4 + 3] !== output[i * 4 + 3]) alphaMismatch++;
    let changed = false;
    for (let c = 0; c < 4; c++) if (original[i * 4 + c] !== output[i * 4 + c]) { changed = true; if (!mask[i]) outsideMismatch++; }
    if (changed) changedPixels++;
  }
  if (alphaMismatch || outsideMismatch) throw new Error(`Preservation failed: alpha=${alphaMismatch}, outside=${outsideMismatch}.`);
  return { alphaMismatch, outsideMismatch, changedPixels };
}

async function prepare({ original, clean, out }) {
  const targets = { original: `${out}-original.webp`, reference: `${out}-reference.png`, mask: `${out}-patch-mask.png`, qa: `${out}-qa.json` };
  for (const target of Object.values(targets)) {
    try { await fs.access(target); throw new Error(`Refusing to overwrite: ${target}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const sourceMeta = await sharp(original).metadata(); const cleanMeta = await sharp(clean).metadata();
  if (sourceMeta.width !== SIZE || sourceMeta.height !== SIZE || !sourceMeta.hasAlpha) throw new Error('Original must be 1024×1024 RGBA.');
  if (cleanMeta.width !== 1376 || cleanMeta.height !== 768) throw new Error('Expected the reviewed 1376×768 Flow clean still; do not silently reframe another generation.');
  const rgba = await sharp(original).ensureAlpha().raw().toBuffer();
  const rgb = await sharp(clean).extract({ left: 304, top: 0, width: 768, height: 768 }).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
  const mask = makeMask(SIZE, SIZE); const shift = alignPatch(rgba, rgb, SIZE, SIZE);
  const result = composite(rgba, rgb, mask, SIZE, SIZE, shift);
  const report = { source: original, clean, patchPolygons: POLYGONS, feather: FEATHER, alignment: shift, ...verify(rgba, result, mask) };
  const encoded = await sharp(result, { raw: { width: SIZE, height: SIZE, channels: 4 } }).webp({ lossless: true, exact: true, effort: 6 }).toBuffer();
  report.encoded = verify(rgba, await sharp(encoded).ensureAlpha().raw().toBuffer(), mask);
  const square = await sharp(encoded).resize(720, 720).flatten({ background: '#808080' }).png().toBuffer();
  const reference = await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#808080' } }).composite([{ input: square, left: 280, top: 0 }]).png().toBuffer();
  const maskImage = await sharp(Buffer.from(Array.from(mask, v => Math.round(v * 255))), { raw: { width: SIZE, height: SIZE, channels: 1 } }).png().toBuffer();
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(targets.original, encoded, { flag: 'wx' });
  await fs.writeFile(targets.reference, reference, { flag: 'wx' });
  await fs.writeFile(targets.mask, maskImage, { flag: 'wx' });
  await fs.writeFile(targets.qa, JSON.stringify(report, null, 2), { flag: 'wx' });
  return { ...targets, ...report };
}

if (require.main === module) {
  prepare({ original: path.resolve(process.argv[2] || 'public/images/menu/music2.webp'), clean: path.resolve(process.argv[3] || 'output/flow-muvs-v2/music-clean-flow.png'), out: path.resolve(process.argv[4] || 'output/flow-muvs-v2/music-single') })
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { makeMask, composite, verify, prepare, POLYGONS };
