#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sharp = require('../server/node_modules/sharp');
const { interiorMask, temporalStats } = require('./prepare-object-loop.cjs');

const SIZE = 720;
const FPS = 24;
const FRAMES = 144;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const srgbToLinear = (value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const linearToSrgb = (value) => value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
const linearLookup = Float32Array.from({ length: 256 }, (_, index) => srgbToLinear(index / 255));
const srgbLookup = Uint8Array.from({ length: 65536 }, (_, index) => Math.round(clamp(linearToSrgb(index / 65535), 0, 1) * 255));

const region = (name, x, y, sx, sy, strength, phase = 0) => ({ name, x, y, sx, sy, strength, phase });
const PRESETS = {
  mixes: {
    original: 'public/images/menu/mixes-trans.webp', color: [1, 0.79, 0.47], maximumRgbLift: [56, 46, 32],
    description: 'Slow warm area-light reflections travel from existing left speaker bronze trim through the statue to right speaker trim; no displaced pixels, shapes or light stripes.',
    roi: { x: 0.5, y: 0.395, sx: 0.070, sy: 0.085 },
    detailRois: {
      leftSpeaker: { x: 0.16, y: 0.30, sx: 0.15, sy: 0.29 },
      rightSpeaker: { x: 0.84, y: 0.30, sx: 0.15, sy: 0.29 },
    },
    regions: [
      region('crown', 0.5, 0.276, 0.049, 0.049, 0.18, 0.3),
      region('left cheek and brow', 0.47, 0.384, 0.027, 0.058, 0.19, 0.32),
      region('right cheek and brow', 0.53, 0.392, 0.027, 0.060, 0.20, -0.42),
      region('left shoulder bronze folds', 0.372, 0.54, 0.060, 0.090, 0.19, 0.8),
      region('right shoulder bronze folds', 0.615, 0.541, 0.061, 0.094, 0.20, -0.85),
      region('chest ornaments', 0.502, 0.555, 0.068, 0.076, 0.14, -0.15),
      region('left hand', 0.319, 0.696, 0.034, 0.045, 0.16, 0.6),
      region('right hand', 0.566, 0.699, 0.038, 0.045, 0.18, -0.8),
      region('left bronze driver', 0.171, 0.622, 0.105, 0.105, 0.046, 1.0),
      region('right bronze driver', 0.827, 0.62, 0.105, 0.105, 0.048, -1.1),
      region('mixer metal detail', 0.50, 0.786, 0.265, 0.044, 0.042, -0.6),
      // Short separated patches follow existing metal parts, not a synthetic moving bar.
      // Positive phase reaches its highlight first; the right tower follows the statue.
      region('left upper bronze frame', 0.17, 0.058, 0.10, 0.026, 0.18, 1.5),
      region('left upper driver metal edge', 0.105, 0.216, 0.038, 0.081, 0.16, 1.4),
      region('left carved inner cabinet trim', 0.295, 0.354, 0.028, 0.098, 0.16, 1.25),
      region('left lower circular bronze rim', 0.176, 0.548, 0.087, 0.029, 0.14, 1.3),
      region('left lower outer carved trim', 0.040, 0.689, 0.031, 0.120, 0.14, 1.2),
      region('right upper bronze frame', 0.83, 0.058, 0.10, 0.026, 0.18, -1.5),
      region('right upper driver metal edge', 0.895, 0.216, 0.038, 0.081, 0.16, -1.4),
      region('right carved inner cabinet trim', 0.705, 0.354, 0.028, 0.098, 0.16, -1.25),
      region('right lower circular bronze rim', 0.824, 0.548, 0.087, 0.029, 0.14, -1.3),
      region('right lower outer carved trim', 0.960, 0.689, 0.031, 0.120, 0.14, -1.2),
      region('left front carved bronze base', 0.305, 0.902, 0.135, 0.034, 0.09, 0.85),
      region('right front carved bronze base', 0.695, 0.902, 0.135, 0.034, 0.09, -0.85),
    ],
  },
  code: {
    original: 'public/images/menu/code2.webp', color: [0.36, 0.74, 1.24], maximumRgbLift: [24, 42, 58],
    description: 'Screen-facing face, chin-hand, nearby chest and typing hand receive slowly varying white-blue screen light; sculpture and laptop remain fixed.',
    roi: { x: 0.491, y: 0.160, sx: 0.052, sy: 0.068 },
    regions: [
      region('screen-facing face', 0.492, 0.154, 0.036, 0.048, 0.255, 0),
      region('chin and thinking hand', 0.505, 0.217, 0.037, 0.027, 0.155, 0.12),
      region('near upper chest', 0.462, 0.292, 0.066, 0.064, 0.083, 0.12),
      region('screen-facing forearm', 0.548, 0.318, 0.029, 0.070, 0.085, 0.04),
      region('typing hand', 0.494, 0.417, 0.049, 0.024, 0.158, 0.1),
      region('keyboard reflection', 0.544, 0.431, 0.068, 0.012, 0.075, 0.05),
    ],
  },
};

function lightWave(frame, frames, phase = 0) {
  const position = frame === frames - 1 ? 0 : frame / (frames - 1);
  return (1 - Math.cos(4 * Math.PI * position + phase)) / 2;
}

function spatialWeight(x, y, area) {
  const squaredDistance = ((x - area.x) / area.sx) ** 2 + ((y - area.y) / area.sy) ** 2;
  return squaredDistance < 9 ? Math.exp(-squaredDistance / 2) : 0;
}

function prepareFields(rgba, gray, softenedGray, size, preset) {
  const count = size * size;
  const alpha = Buffer.alloc(count);
  const base = Buffer.alloc(count * 3);
  for (let i = 0; i < count; i += 1) {
    alpha[i] = rgba[i * 4 + 3];
    for (let channel = 0; channel < 3; channel += 1) base[i * 3 + channel] = rgba[i * 4 + channel];
  }
  const interior = interiorMask(alpha, size, size);
  const maps = preset.regions.map(() => new Float32Array(count));
  const active = [];
  for (let i = 0; i < count; i += 1) {
    if (!interior[i]) continue;
    const x = (i % size) / (size - 1);
    const y = Math.floor(i / size) / (size - 1);
    const luminance = gray[i] / 255;
    const raisedDetail = clamp((gray[i] - softenedGray[i]) / 24, 0, 1);
    const material = preset === PRESETS.mixes
      ? clamp((luminance - 0.09) / 0.56, 0, 1) * (0.42 + 0.58 * raisedDetail)
      : 0.52 + 0.40 * (1 - luminance);
    let sum = 0;
    for (let area = 0; area < preset.regions.length; area += 1) {
      const value = spatialWeight(x, y, preset.regions[area]) * preset.regions[area].strength * material * interior[i] / 255;
      maps[area][i] = value;
      sum += value;
    }
    if (sum > 0.00005) active.push(i);
  }
  return { base, alpha, maps, active, preset };
}

function renderFrame(fields, index, frames = FRAMES) {
  const { base, maps, active, preset } = fields;
  const output = Buffer.from(base);
  const values = preset.regions.map((area) => lightWave(index, frames, area.phase));
  for (const pixel of active) {
    let illumination = 0;
    for (let area = 0; area < maps.length; area += 1) illumination += maps[area][pixel] * values[area];
    for (let channel = 0; channel < 3; channel += 1) {
      const position = pixel * 3 + channel;
      const initial = base[position];
      const linear = clamp(linearLookup[initial] + illumination * preset.color[channel], 0, 1);
      output[position] = Math.min(initial + preset.maximumRgbLift[channel], srgbLookup[Math.round(linear * 65535)]);
    }
  }
  return output;
}

function run(command, args, maxBytes = 32 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let size = 0;
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), 120_000);
    child.stdout.on('data', (chunk) => { size += chunk.length; if (size > maxBytes) child.kill('SIGKILL'); else chunks.push(chunk); });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => { clearTimeout(timer); if (code !== 0) reject(new Error(stderr || `Media process failed: ${code}`)); else resolve(Buffer.concat(chunks)); });
  });
}

async function encode(ffmpeg, filename, fields) {
  const child = spawn(ffmpeg, ['-nostdin', '-hide_banner', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24',
    '-video_size', `${SIZE}x${SIZE}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=bt709',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-profile:v', 'high', '-level:v', '3.1',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-color_range', 'tv',
    '-g', '48', '-force_key_frames', `0,${((FRAMES - 1) / FPS).toFixed(8)}`,
    '-x264-params', `zones=0,6,q=18/${FRAMES - 7},${FRAMES - 1},q=18`, '-threads', '2', '-movflags', '+faststart',
    '-map_metadata', '-1', '-n', filename], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stdin.on('error', () => {});
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
  const timer = setTimeout(() => child.kill('SIGKILL'), 180_000);
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(stderr || `Encoder failed: ${code}`)));
  });
  completion.catch(() => {});
  const snapshots = new Map();
  try {
    for (let frame = 0; frame < FRAMES; frame += 1) {
      const rgb = renderFrame(fields, frame);
      if ([0, 18, 36, 54, 143].includes(frame)) snapshots.set(frame, rgb);
      await new Promise((resolve, reject) => child.stdin.write(rgb, (error) => error ? reject(error) : resolve()));
    }
    child.stdin.end();
    await completion;
  } finally { clearTimeout(timer); if (child.exitCode === null) child.kill('SIGKILL'); }
  return snapshots;
}

function roiDelta(first, second, alpha, area, size) {
  let difference = 0;
  let total = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const weight = spatialWeight((pixel % size) / (size - 1), Math.floor(pixel / size) / (size - 1), area) * alpha[pixel] / 255;
    if (weight < 0.01) continue;
    for (let channel = 0; channel < 3; channel += 1) difference += Math.abs(second[pixel * 3 + channel] - first[pixel * 3 + channel]) * weight;
    total += weight * 3;
  }
  return difference / (total || 1);
}

function roiExtremes(frames, alpha, area, size) {
  const frameBytes = size * size * 3;
  const points = [];
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const weight = spatialWeight((pixel % size) / (size - 1), Math.floor(pixel / size) / (size - 1), area) * alpha[pixel] / 255;
    if (weight > 0.01) points.push({ pixel, weight });
  }
  let minimum = { frame: 0, brightness: Infinity };
  let maximum = { frame: 0, brightness: -Infinity };
  for (let frame = 0; frame < frames.length / frameBytes; frame += 1) {
    let sum = 0; let total = 0;
    for (const { pixel, weight } of points) {
      for (let channel = 0; channel < 3; channel += 1) sum += frames[frame * frameBytes + pixel * 3 + channel] * weight;
      total += weight * 3;
    }
    const brightness = sum / (total || 1);
    if (brightness < minimum.brightness) minimum = { frame, brightness };
    if (brightness > maximum.brightness) maximum = { frame, brightness };
  }
  return { minimum, maximum };
}

async function maskedPng(rgb, alpha, size = SIZE) {
  return sharp(rgb, { raw: { width: size, height: size, channels: 3 } })
    .joinChannel(alpha, { raw: { width: size, height: size, channels: 1 } }).png().toBuffer();
}

async function prepare(name, directory, ffmpeg = 'ffmpeg') {
  const preset = PRESETS[name];
  if (!preset) throw new Error('Choose --object mixes or code.');
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, preset.original);
  const stem = path.join(path.resolve(directory), name === 'code' ? 'code-screen-light' : 'mixes-sunlight');
  const outputs = { video: `${stem}.mp4`, alpha: `${stem}-alpha.png`, poster: `${stem}-poster.webp`, report: `${stem}-qa.json`, contact: `${stem}-contact.png` };
  for (const target of Object.values(outputs)) if (fs.existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== metadata.height || !metadata.hasAlpha) throw new Error('Expected the unchanged square transparent original.');
  const rgba = await sharp(source).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer();
  const gray = await sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } }).removeAlpha().greyscale().raw().toBuffer();
  const softened = await sharp(gray, { raw: { width: SIZE, height: SIZE, channels: 1 } }).blur(1.4).greyscale().raw().toBuffer();
  const fields = prepareFields(rgba, gray, softened, SIZE, preset);
  await fsp.mkdir(path.resolve(directory), { recursive: true });
  const temporary = await fsp.mkdtemp(path.join(path.resolve(directory), '.relighting-'));
  const created = [];
  try {
    const snapshots = await encode(ffmpeg, path.join(temporary, 'loop.mp4'), fields);
    await sharp(fields.alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } }).png().toFile(path.join(temporary, 'alpha.png'));
    await sharp(await maskedPng(snapshots.get(0), fields.alpha)).webp({ lossless: true }).toFile(path.join(temporary, 'poster.webp'));
    const decoded = await run(ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-i', path.join(temporary, 'loop.mp4'), '-vf', 'scale=300:300:flags=area,format=rgb24', '-an', '-f', 'rawvideo', 'pipe:1'], FRAMES * 300 * 300 * 3 + 1024);
    const alphaSmall = await sharp(fields.alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(300, 300).greyscale().raw().toBuffer();
    const encodedStats = temporalStats(decoded, alphaSmall, 300, 300);
    const frameBytes = 300 * 300 * 3;
    const extremes = roiExtremes(decoded, alphaSmall, preset.roi, 300);
    const detailRoiStats = {};
    for (const [detail, roi] of Object.entries(preset.detailRois || {})) {
      const range = roiExtremes(decoded, alphaSmall, roi, 300);
      const sample = (frame) => decoded.subarray(frame * frameBytes, (frame + 1) * frameBytes);
      detailRoiStats[detail] = { roi, ...range, meanRgbDelta: roiDelta(sample(range.minimum.frame), sample(range.maximum.frame), alphaSmall, roi, 300) };
    }
    const selectedFrames = [extremes.minimum.frame, extremes.maximum.frame, 18, 54];
    const displaySnapshots = selectedFrames.map((frame) => decoded.subarray(frame * frameBytes, (frame + 1) * frameBytes));
    const composites = [];
    for (let i = 0; i < displaySnapshots.length; i += 1) {
      const card = await sharp(await maskedPng(displaySnapshots[i], alphaSmall, 300)).flatten({ background: '#bdbdbd' }).png().toBuffer();
      composites.push({ input: card, left: i * 300, top: 30 });
      const label = Buffer.from(`<svg width="300" height="30"><rect width="300" height="30" fill="#eeeeee"/><text x="10" y="21" font-family="sans-serif" font-size="14" fill="#222">${name} · ${['minimum','peak','rising','falling'][i]} · ${(selectedFrames[i] / FPS).toFixed(2)}s</text></svg>`);
      composites.push({ input: label, left: i * 300, top: 0 });
    }
    await sharp({ create: { width: 1200, height: 330, channels: 3, background: '#bdbdbd' } }).composite(composites).png().toFile(path.join(temporary, 'contact.png'));
    const report = { object: name, original: source, description: preset.description, fps: FPS, frames: FRAMES, duration: FRAMES / FPS,
      dimensions: [SIZE, SIZE], audio: false, geometry: 'Exactly the same original RGB pixel positions; no generated pixels, warps, optical flow, scaling or mesh displacement per frame.',
      colorProcessing: 'sRGB decode → additive illumination in linear RGB → sRGB encode; explicit BT.709 matrix/primaries and sRGB transfer tag.',
      modulationHz: 1 / 3, maximumRgbLift: preset.maximumRgbLift, lightColor: preset.color, regions: preset.regions,
      alpha: 'Unmodified alpha from original resized once to 720; semi-transparent edges/shadows and 2px opaque rim receive no relighting.',
      rawFirstLastIdentical: snapshots.get(0).equals(snapshots.get(143)),
      featureRoi: preset.roi, featureRoiExtremes: extremes, featureRoiMeanDelta300px: roiDelta(displaySnapshots[0], displaySnapshots[1], alphaSmall, preset.roi, 300),
      detailRoiStats,
      encodedTemporalQa300px: encodedStats,
    };
    await fsp.writeFile(path.join(temporary, 'qa.json'), JSON.stringify(report, null, 2));
    const files = { video: 'loop.mp4', alpha: 'alpha.png', poster: 'poster.webp', report: 'qa.json', contact: 'contact.png' };
    for (const [key, destination] of Object.entries(outputs)) { await fsp.copyFile(path.join(temporary, files[key]), destination, fs.constants.COPYFILE_EXCL); created.push(destination); }
    return { name, outputs, bytes: (await fsp.stat(outputs.video)).size, featureRoiMeanDelta300px: report.featureRoiMeanDelta300px, rawFirstLastIdentical: report.rawFirstLastIdentical, wrap: encodedStats.wrap };
  } catch (error) {
    for (const target of created) await fsp.unlink(target).catch(() => {});
    throw error;
  } finally {
    if (path.dirname(path.resolve(temporary)) === path.resolve(directory) && path.basename(temporary).startsWith('.relighting-')) await fsp.rm(temporary, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const options = { object: 'all', output: path.resolve(__dirname, '../output/flow-muvs-v2'), ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg' };
  (async () => {
    for (let i = 2; i < process.argv.length; i += 1) {
      const field = { '--object': 'object', '--output': 'output', '--ffmpeg': 'ffmpeg' }[process.argv[i]];
      if (!field || !process.argv[i + 1]) throw new Error('Usage: node scripts/prepare-object-relighting.cjs [--object mixes|code|all] [--output directory] [--ffmpeg executable]');
      options[field] = process.argv[++i];
    }
    const objects = options.object === 'all' ? ['mixes', 'code'] : [options.object];
    for (const name of objects) console.log(JSON.stringify(await prepare(name, options.output, options.ffmpeg), null, 2));
  })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { srgbToLinear, linearToSrgb, lightWave, spatialWeight, prepareFields, renderFrame, roiExtremes, PRESETS, prepare };
