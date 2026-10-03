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
    original: 'public/images/menu/mixes-trans.webp', color: [1, 0.76, 0.40], maximumRgbLift: [36, 28, 17],
    envelope: 'side-glint',
    description: 'Brief localized warm glints on side bronze trim every three seconds, separated by a quiet interval; face, chest and ambient body brightness stay unchanged.',
    roi: { x: 0.105, y: 0.255, sx: 0.060, sy: 0.13 },
    detailRois: {
      leftTrim: { x: 0.09, y: 0.30, sx: 0.060, sy: 0.16 },
      rightTrim: { x: 0.91, y: 0.30, sx: 0.060, sy: 0.16 },
      unchangedFace: { x: 0.5, y: 0.395, sx: 0.040, sy: 0.060 },
    },
    regions: [
      // Phase is peak time in the three-second cycle for this pulse envelope.
      // Separated short patches catch existing trim, never the whole composition.
      region('left upper bronze frame', 0.17, 0.058, 0.074, 0.020, 0.16, 0.85),
      region('left upper driver metal edge', 0.105, 0.216, 0.028, 0.080, 0.19, 0.96),
      region('left carved inner cabinet trim', 0.295, 0.354, 0.020, 0.075, 0.14, 1.08),
      region('left lower outer carved trim', 0.040, 0.635, 0.022, 0.090, 0.13, 1.18),
      region('left shoulder outer bronze fold', 0.364, 0.531, 0.019, 0.055, 0.095, 1.22),
      region('right shoulder outer bronze fold', 0.636, 0.531, 0.019, 0.055, 0.095, 1.38),
      region('right lower outer carved trim', 0.960, 0.635, 0.022, 0.090, 0.13, 1.42),
      region('right carved inner cabinet trim', 0.705, 0.354, 0.020, 0.075, 0.14, 1.52),
      region('right upper driver metal edge', 0.895, 0.216, 0.028, 0.080, 0.19, 1.62),
      region('right upper bronze frame', 0.83, 0.058, 0.074, 0.020, 0.16, 1.73),
    ],
  },
  code: {
    original: 'public/images/menu/code2.webp', color: [0.22, 0.78, 1.8], maximumRgbLift: [24, 58, 84],
    highlightRolloff: true,
    description: 'Clearly visible white-blue screen spill on the face, chin-hand and typing hand; soft highlight rolloff preserves marble relief, with fixed sculpture/laptop geometry.',
    roi: { x: 0.491, y: 0.160, sx: 0.052, sy: 0.068 },
    detailRois: {
      chinHand: { x: 0.505, y: 0.217, sx: 0.04, sy: 0.034 },
      typingHand: { x: 0.494, y: 0.417, sx: 0.054, sy: 0.031 },
    },
    regions: [
      // One screen is the light source: shared phase starts/ends at the exact
      // original RGB, also providing a clean landing frame for a separate intro.
      region('screen-facing face', 0.492, 0.154, 0.038, 0.050, 0.46),
      region('chin and thinking hand', 0.505, 0.217, 0.039, 0.030, 0.32),
      region('near upper chest', 0.462, 0.292, 0.064, 0.060, 0.105),
      region('screen-facing forearm', 0.548, 0.318, 0.029, 0.064, 0.13),
      region('typing hand', 0.494, 0.417, 0.049, 0.026, 0.29),
      region('keyboard reflection', 0.544, 0.431, 0.068, 0.012, 0.12),
    ],
  },
};

function lightWave(frame, frames, phase = 0) {
  const position = frame === frames - 1 ? 0 : frame / (frames - 1);
  return (1 - Math.cos(4 * Math.PI * position + phase)) / 2;
}

function glintWave(frame, frames, peakSeconds, widthSeconds = 0.86) {
  const time = frame === frames - 1 ? 0 : (frame / FPS) % 3;
  const distance = Math.abs(time - peakSeconds);
  if (distance >= widthSeconds / 2) return 0;
  const weight = Math.cos(Math.PI * distance / widthSeconds);
  return weight * weight;
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
  const values = preset.regions.map((area) => preset.envelope === 'side-glint'
    ? glintWave(index, frames, area.phase) : lightWave(index, frames, area.phase));
  for (const pixel of active) {
    let illumination = 0;
    for (let area = 0; area < maps.length; area += 1) illumination += maps[area][pixel] * values[area];
    for (let channel = 0; channel < 3; channel += 1) {
      const position = pixel * 3 + channel;
      const initial = base[position];
      const energy = illumination * preset.color[channel];
      const baseLinear = linearLookup[initial];
      const headroom = 1 - baseLinear;
      // Gradual shoulder instead of a hard blue-channel clip on pale marble.
      // No darkening/tint layer: only bounded added screen-light energy.
      const added = preset.highlightRolloff ? headroom * -Math.expm1(-energy / Math.max(0.2, headroom)) : energy;
      const linear = clamp(baseLinear + added, 0, 1);
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

function roiColorDelta(first, second, alpha, area, size) {
  const sums = [0, 0, 0];
  let total = 0;
  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const weight = spatialWeight((pixel % size) / (size - 1), Math.floor(pixel / size) / (size - 1), area) * alpha[pixel] / 255;
    if (weight < 0.01) continue;
    for (let channel = 0; channel < 3; channel += 1) sums[channel] += (second[pixel * 3 + channel] - first[pixel * 3 + channel]) * weight;
    total += weight;
  }
  const rgb = sums.map((value) => value / (total || 1));
  return { rgb, blueMinusRed: rgb[2] - rgb[0] };
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

async function writeDecodedPoster({ video, alpha, output, reference, ffmpeg = 'ffmpeg' }) {
  for (const target of [output, `${output}.qa.json`]) if (fs.existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
  const rgb = await run(ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-i', video,
    '-frames:v', '1', '-vf', 'format=rgb24', '-an', '-f', 'rawvideo', 'pipe:1'], SIZE * SIZE * 3);
  if (rgb.length !== SIZE * SIZE * 3) throw new Error('Poster extraction requires the final 720-square video.');
  const alphaMetadata = await sharp(alpha).metadata();
  if (alphaMetadata.width !== SIZE || alphaMetadata.height !== SIZE) throw new Error('Poster alpha must match the final 720-square video.');
  const mask = await sharp(alpha).greyscale().raw().toBuffer();
  await fsp.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  const webp = await sharp(await maskedPng(rgb, mask)).webp({ lossless: true, effort: 6 }).toBuffer();
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
  let changedVisibleRgb = 0;
  let changedAlpha = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (decoded[pixel * 4 + 3] !== mask[pixel]) changedAlpha += 1;
    if (mask[pixel]) for (let channel = 0; channel < 3; channel += 1) {
      if (decoded[pixel * 4 + channel] !== rgb[pixel * 3 + channel]) changedVisibleRgb += 1;
    }
  }
  if (changedAlpha || changedVisibleRgb) throw new Error('Lossless poster did not preserve decoded RGB and original alpha.');
  let previous = null;
  if (reference) {
    const original = await sharp(reference).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
    previous = temporalStats(Buffer.concat([rgb, original]), mask, SIZE, SIZE).wrap;
  }
  const report = { video: path.resolve(video), alpha: path.resolve(alpha), output: path.resolve(output),
    bytes: webp.length, dimensions: [SIZE, SIZE], firstDecodedFrame: 0,
    changedVisibleRgb, changedAlpha, previousPosterDifference: previous,
    colorProcessing: 'Decoded final video RGB with unchanged external alpha, stored in lossless WebP; no white matte, no resize and no color grading.',
  };
  await fsp.writeFile(output, webp, { flag: 'wx' });
  await fsp.writeFile(`${output}.qa.json`, JSON.stringify(report, null, 2), { flag: 'wx' });
  return report;
}

async function writeFallbackPoster({ poster, output, size = 96 }) {
  if (![96, 128].includes(size)) throw new Error('Inline fallback size must be 96 or 128 pixels.');
  if (fs.existsSync(output)) throw new Error(`Refusing to overwrite ${output}`);
  const image = await sharp(poster).resize(size, size).webp({ quality: 55, alphaQuality: 100, effort: 6 }).toBuffer();
  const info = await sharp(image).metadata();
  if (!info.hasAlpha) throw new Error('Inline object fallback must retain transparency.');
  await fsp.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fsp.writeFile(output, image, { flag: 'wx' });
  return { poster: path.resolve(poster), output: path.resolve(output), bytes: image.length, dimensions: [size, size], quality: 55, alphaQuality: 100 };
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
    // Use the final encoded/decoded first frame, not the pre-encode original:
    // switching poster to video then cannot introduce a codec color difference.
    await writeDecodedPoster({ video: path.join(temporary, 'loop.mp4'), alpha: path.join(temporary, 'alpha.png'),
      output: path.join(temporary, 'poster.webp'), reference: source, ffmpeg });
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
    const selectedFrames = [preset.envelope === 'side-glint' ? 0 : extremes.minimum.frame, extremes.maximum.frame,
      preset.envelope === 'side-glint' ? 40 : 18, preset.envelope === 'side-glint' ? 60 : 54];
    const displaySnapshots = selectedFrames.map((frame) => decoded.subarray(frame * frameBytes, (frame + 1) * frameBytes));
    const composites = [];
    for (let i = 0; i < displaySnapshots.length; i += 1) {
      const card = await sharp(await maskedPng(displaySnapshots[i], alphaSmall, 300)).flatten({ background: '#bdbdbd' }).png().toBuffer();
      composites.push({ input: card, left: i * 300, top: 30 });
      const labels = preset.envelope === 'side-glint' ? ['quiet', 'left glint', 'right glint', 'quiet'] : ['minimum', 'peak', 'rising', 'falling'];
      const label = Buffer.from(`<svg width="300" height="30"><rect width="300" height="30" fill="#eeeeee"/><text x="10" y="21" font-family="sans-serif" font-size="14" fill="#222">${name} · ${labels[i]} · ${(selectedFrames[i] / FPS).toFixed(2)}s</text></svg>`);
      composites.push({ input: label, left: i * 300, top: 0 });
    }
    await sharp({ create: { width: 1200, height: 330, channels: 3, background: '#bdbdbd' } }).composite(composites).png().toFile(path.join(temporary, 'contact.png'));
    const report = { object: name, original: source, description: preset.description, fps: FPS, frames: FRAMES, duration: FRAMES / FPS,
      dimensions: [SIZE, SIZE], audio: false, geometry: 'Exactly the same original RGB pixel positions; no generated pixels, warps, optical flow, scaling or mesh displacement per frame.',
      colorProcessing: 'sRGB decode → additive illumination in linear RGB (optional soft highlight rolloff) → sRGB encode; explicit BT.709 matrix/primaries and sRGB transfer tag.',
      modulationHz: 1 / 3, envelope: preset.envelope || 'continuous-cosine', maximumRgbLift: preset.maximumRgbLift, lightColor: preset.color, highlightRolloff: Boolean(preset.highlightRolloff), regions: preset.regions,
      alpha: 'Unmodified alpha from original resized once to 720; semi-transparent edges/shadows and 2px opaque rim receive no relighting.',
      rawFirstLastIdentical: snapshots.get(0).equals(snapshots.get(143)),
      featureRoi: preset.roi, featureRoiExtremes: extremes, featureRoiMeanDelta300px: roiDelta(displaySnapshots[0], displaySnapshots[1], alphaSmall, preset.roi, 300),
      featureRoiColorDelta300px: roiColorDelta(displaySnapshots[0], displaySnapshots[1], alphaSmall, preset.roi, 300),
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
  const options = { object: 'all', output: path.resolve(__dirname, '../output/flow-muvs-v3'), ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg' };
  (async () => {
    for (let i = 2; i < process.argv.length; i += 1) {
      const field = { '--object': 'object', '--output': 'output', '--ffmpeg': 'ffmpeg', '--poster-video': 'posterVideo',
        '--poster-alpha': 'posterAlpha', '--poster-output': 'posterOutput', '--poster-reference': 'posterReference',
        '--fallback-poster': 'fallbackPoster', '--fallback-output': 'fallbackOutput' }[process.argv[i]];
      if (!field || !process.argv[i + 1]) throw new Error('Usage: node scripts/prepare-object-relighting.cjs [--object mixes|code|all] [--output directory] [--ffmpeg executable]');
      options[field] = process.argv[++i];
    }
    if (options.fallbackPoster) {
      if (!options.fallbackOutput) throw new Error('Inline fallback generation needs --fallback-output.');
      console.log(JSON.stringify(await writeFallbackPoster({ poster: options.fallbackPoster, output: options.fallbackOutput }), null, 2));
      return;
    }
    if (options.posterVideo) {
      if (!options.posterAlpha || !options.posterOutput) throw new Error('Poster extraction also needs --poster-alpha and --poster-output.');
      console.log(JSON.stringify(await writeDecodedPoster({ video: options.posterVideo, alpha: options.posterAlpha,
        output: options.posterOutput, reference: options.posterReference, ffmpeg: options.ffmpeg }), null, 2));
      return;
    }
    const objects = options.object === 'all' ? ['mixes', 'code'] : [options.object];
    for (const name of objects) console.log(JSON.stringify(await prepare(name, options.output, options.ffmpeg), null, 2));
  })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { srgbToLinear, linearToSrgb, lightWave, glintWave, spatialWeight, prepareFields, renderFrame, roiExtremes, roiColorDelta, PRESETS, prepare, writeDecodedPoster, writeFallbackPoster };
