#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sharp = require('../server/node_modules/sharp');

const SIZE = 720;
const FPS = 24;
const QA_SIZE = 180;

function parseMotionRegion(value) {
  if (value == null) return null;
  const region = String(value).split(',').map(Number);
  const [x, y, width, height] = region;
  if (region.length !== 4 || region.some((item) => !Number.isInteger(item))
      || x < 0 || y < 0 || width < 16 || height < 16 || x + width > SIZE || y + height > SIZE) {
    throw new Error('--motion-region must be x,y,width,height inside the 720-square output, at least 16px wide/high.');
  }
  return region;
}

function restrictMotionRegion(mask, width, height, region, feather = 8) {
  if (!region) return mask;
  if (mask.length !== width * height) throw new Error('Motion mask dimensions do not match.');
  const [left, top, regionWidth, regionHeight] = region;
  const result = Buffer.alloc(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.min(x - left, y - top, left + regionWidth - 1 - x, top + regionHeight - 1 - y);
      const index = y * width + x;
      result[index] = Math.round(mask[index] * smoothstep(distance / feather));
    }
  }
  return result;
}

// Explicit opt-in for a reviewed internal patch. Do not expand tiny near-opaque
// alpha defects into large frozen holes over a moving subject. Keep weighting,
// and do not animate any pixel below the conservative source-alpha 200 guard.
function interiorMotionMask(alpha, width, height, region, feather = 8) {
  if (!region) throw new Error('--interior-motion requires --motion-region.');
  if (alpha.length !== width * height) throw new Error('Alpha dimensions do not match.');
  const mask = Buffer.from(alpha);
  for (let i = 0; i < mask.length; i += 1) if (alpha[i] < 200) mask[i] = 0;
  return restrictMotionRegion(mask, width, height, region, feather);
}

function parseLightLimit(value = '8') {
  const limits = String(value).split(',').map(Number);
  if (![1, 3].includes(limits.length) || limits.some((limit) => !Number.isInteger(limit) || limit < 0 || limit > 32)) {
    throw new Error('--light-limit must be 0–32, or three RGB values such as 8,20,8.');
  }
  return limits.length === 1 ? [limits[0], limits[0], limits[0]] : limits;
}

const smoothstep = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

function seamWeight(time, lastFrameTime, fade = 0.25) {
  return smoothstep(Math.min(time / fade, (lastFrameTime - time) / fade));
}

// Preserve the source's semi-transparent edges/shadows, plus a small opaque rim.
// Distance is a conservative Manhattan distance; the fade always stays inside the silhouette.
function interiorMask(alpha, width, height, erosion = 2, feather = 3) {
  if (alpha.length !== width * height) throw new Error('Alpha dimensions do not match.');
  const distance = new Uint16Array(alpha.length);
  const mask = Buffer.alloc(alpha.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (alpha[i] < 250) continue;
      distance[i] = Math.min(x + 1, y + 1, width - x, height - y,
        x ? distance[i - 1] + 1 : 1, y ? distance[i - width] + 1 : 1);
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      if (!distance[i]) continue;
      distance[i] = Math.min(distance[i], x < width - 1 ? distance[i + 1] + 1 : 1,
        y < height - 1 ? distance[i + width] + 1 : 1);
      mask[i] = Math.round(255 * smoothstep((distance[i] - erosion) / feather));
    }
  }
  return mask;
}

function gradient(image, width, height) {
  const result = new Float32Array(image.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      result[i] = Math.hypot(image[i + 1] - image[i - 1], image[i + width] - image[i - width]);
    }
  }
  return result;
}

// This is only a QA measurement; it never transforms the generated video.
function estimateShift(reference, candidate, width, height, alpha, radius = 3) {
  const a = gradient(reference, width, height);
  const b = gradient(candidate, width, height);
  const points = [];
  for (let y = radius + 1; y < height - radius - 1; y += 1) {
    for (let x = radius + 1; x < width - radius - 1; x += 1) {
      const i = y * width + x;
      if (alpha[i] > 128 && a[i] > 12) points.push(i);
    }
  }
  if (points.length < 32) return { dx: 0, dy: 0, score: 0, reliable: false };
  let best = { dx: 0, dy: 0, score: -Infinity, reliable: false };
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      let dot = 0; let aa = 0; let bb = 0;
      const offset = dy * width + dx;
      for (const i of points) { dot += a[i] * b[i + offset]; aa += a[i] ** 2; bb += b[i + offset] ** 2; }
      const score = dot / Math.sqrt(aa * bb || 1);
      if (score > best.score + 1e-6 || (Math.abs(score - best.score) <= 1e-6 && dx * dx + dy * dy < best.dx ** 2 + best.dy ** 2)) {
        best = { dx, dy, score, reliable: score >= 0.65 };
      }
    }
  }
  return best;
}

function temporalStats(rgbFrames, alpha, width, height) {
  const bytes = width * height * 3;
  const count = rgbFrames.length / bytes;
  if (!Number.isInteger(count) || count < 2 || alpha.length !== width * height) throw new Error('Invalid temporal QA frame buffers.');
  let weight = 0;
  for (const value of alpha) weight += 3 * value / 255;
  function compare(a, b) {
    let absolute = 0;
    let signed = 0;
    for (let i = 0; i < alpha.length; i += 1) {
      const opacity = alpha[i] / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        const delta = rgbFrames[b * bytes + i * 3 + channel] - rgbFrames[a * bytes + i * 3 + channel];
        absolute += Math.abs(delta) * opacity;
        signed += delta * opacity;
      }
    }
    return { mae: absolute / (weight || 1), brightnessDelta: signed / (weight || 1) };
  }
  const adjacent = [];
  for (let i = 1; i < count; i += 1) adjacent.push(compare(i - 1, i).mae);
  adjacent.sort((a, b) => a - b);
  return { resolution: [width, height], frames: count, scale: '0–255 RGB values, weighted by original alpha',
    wrap: compare(count - 1, 0), maximumAdjacent: adjacent.at(-1),
    medianAdjacent: adjacent[Math.floor(adjacent.length * 0.5)], p95Adjacent: adjacent[Math.floor(adjacent.length * 0.95)] };
}

function run(command, args, maxOutput = 8 * 1024 * 1024, timeout = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let bytes = 0;
    let stderr = '';
    let failure;
    const timer = setTimeout(() => { failure = new Error(`${path.basename(command)} timed out.`); child.kill('SIGKILL'); }, timeout);
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxOutput) { failure = new Error('Media inspection exceeded its output limit.'); child.kill('SIGKILL'); }
      else chunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk.toString()).slice(-6000); });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${path.basename(command)} failed (${code}): ${stderr.trim()}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

function parseArgs(args) {
  const options = { crf: 22, maxDrift: 4, ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg', ffprobe: process.env.FFPROBE_PATH || 'ffprobe' };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === '--help' || key === '-h') { options.help = true; continue; }
    if (key === '--allow-drift') { options.allowDrift = true; continue; }
    if (key === '--lighting-only') { options.lightingOnly = true; continue; }
    if (key === '--interior-motion') { options.interiorMotion = true; continue; }
    const fields = { '--original': 'original', '--video': 'video', '--out': 'out', '--crf': 'crf', '--max-drift': 'maxDrift', '--ffmpeg': 'ffmpeg', '--ffprobe': 'ffprobe', '--light-limit': 'lightLimit', '--motion-region': 'motionRegion' };
    if (!fields[key] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${key}`);
    options[fields[key]] = args[++i];
  }
  if (options.help) return options;
  if (!options.original || !options.video || !options.out) throw new Error('Required: --original source.webp --video flow.mp4 --out output/stem');
  options.crf = Number(options.crf);
  options.maxDrift = Number(options.maxDrift);
  options.lightLimit = parseLightLimit(options.lightLimit);
  options.motionRegion = parseMotionRegion(options.motionRegion);
  if (options.interiorMotion && !options.motionRegion) throw new Error('--interior-motion requires --motion-region.');
  if (!Number.isInteger(options.crf) || options.crf < 20 || options.crf > 23) throw new Error('--crf must be 20–23.');
  if (!Number.isFinite(options.maxDrift) || options.maxDrift < 0 || options.maxDrift > 12) throw new Error('--max-drift must be 0–12 pixels.');
  for (const key of ['original', 'video', 'out']) options[key] = path.resolve(options[key]);
  return options;
}

async function prepare(options) {
  if (options.interiorMotion && !options.motionRegion) throw new Error('--interior-motion requires --motion-region.');
  const targets = {
    video: `${options.out}.mp4`, alpha: `${options.out}-alpha.png`,
    poster: `${options.out}-poster.webp`, report: `${options.out}-qa.json`,
  };
  for (const target of Object.values(targets)) if (fs.existsSync(target)) throw new Error(`Refusing to overwrite existing output: ${target}`);
  for (const source of [options.original, options.video]) if (!(await fsp.stat(source)).isFile()) throw new Error('Inputs must be regular local files.');
  const metadata = await sharp(options.original).metadata();
  if (!metadata.hasAlpha || metadata.width !== metadata.height || (metadata.pages || 1) !== 1) throw new Error('Original must be a square, static RGBA image.');
  const probe = JSON.parse((await run(options.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,duration,sample_aspect_ratio:stream_side_data=rotation:format=duration', '-of', 'json', options.video])).toString());
  const stream = probe.streams?.[0];
  const duration = Number(stream?.duration || probe.format?.duration);
  if (stream?.width !== 1280 || stream?.height !== 720 || stream.side_data_list?.some((data) => data.rotation)
      || (stream.sample_aspect_ratio && !['1:1', 'N/A'].includes(stream.sample_aspect_ratio))) throw new Error('Flow input must be unrotated 1280×720 with square pixels; no automatic reframing is performed.');
  if (!Number.isFinite(duration) || duration < 0.5 || duration > 30) throw new Error('Input duration must be 0.5–30 seconds (6 seconds is expected).');
  const frames = Math.max(2, Math.round(duration * FPS));
  const finalDuration = frames / FPS;
  const lastFrameTime = (frames - 1) / FPS;
  const { data: rgba } = await sharp(options.original).resize(SIZE, SIZE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(SIZE * SIZE);
  const rgb = Buffer.alloc(SIZE * SIZE * 3);
  for (let i = 0; i < alpha.length; i += 1) {
    alpha[i] = rgba[i * 4 + 3];
    rgb[i * 3] = rgba[i * 4]; rgb[i * 3 + 1] = rgba[i * 4 + 1]; rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }
  const alphaSmall = await sharp(alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } }).resize(QA_SIZE, QA_SIZE).greyscale().raw().toBuffer();
  const originalSmall = await sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } })
    .flatten({ background: '#808080' }).resize(QA_SIZE, QA_SIZE).greyscale().raw().toBuffer();
  const decoded = await run(options.ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-noautorotate', '-i', options.video,
    '-an', '-sn', '-dn', '-vf', `crop=720:720:280:0,fps=2,scale=${QA_SIZE}:${QA_SIZE}:flags=area,format=gray`,
    '-frames:v', '60', '-f', 'rawvideo', 'pipe:1']);
  const frameSize = QA_SIZE * QA_SIZE;
  const sampledFrames = Math.floor(decoded.length / frameSize);
  if (!sampledFrames) throw new Error('No frames could be inspected.');
  const reference = decoded.subarray(0, frameSize);
  const originalAlignment = estimateShift(originalSmall, reference, QA_SIZE, QA_SIZE, alphaSmall);
  const sampled = [];
  for (let i = 0; i < sampledFrames; i += 1) {
    const shift = estimateShift(reference, decoded.subarray(i * frameSize, (i + 1) * frameSize), QA_SIZE, QA_SIZE, alphaSmall);
    sampled.push({ atApproxSeconds: i / 2, dxPx: shift.dx * SIZE / QA_SIZE, dyPx: shift.dy * SIZE / QA_SIZE,
      correlation: Number(shift.score.toFixed(3)), reliable: shift.reliable });
  }
  const maxTranslation = Math.max(...sampled.map((item) => Math.hypot(item.dxPx, item.dyPx)));
  const initialTranslation = Math.hypot(originalAlignment.dx, originalAlignment.dy) * SIZE / QA_SIZE;
  const warnings = [];
  if (Math.abs(finalDuration - 6) > 0.1) warnings.push(`Expected a 6-second Flow clip; received ${duration.toFixed(3)} seconds.`);
  if (maxTranslation > options.maxDrift) warnings.push(`Possible object drift: ${maxTranslation.toFixed(1)}px (limit ${options.maxDrift}px).`);
  if (initialTranslation > options.maxDrift) warnings.push(`First sampled frame differs from original registration by approximately ${initialTranslation.toFixed(1)}px.`);
  if (!originalAlignment.reliable || sampled.some((item) => !item.reliable)) warnings.push('Registration confidence is low; manually inspect geometry, zoom, rotation and deforming contours.');
  const report = {
    original: options.original, input: options.video, dimensions: [SIZE, SIZE], fps: FPS, frames, duration: finalDuration,
    crf: options.crf, crop: { left: 280, top: 0, width: 720, height: 720 },
    mode: options.lightingOnly ? 'lighting-only: fixed original RGB geometry plus bounded low-frequency Flow lighting delta' : 'native Flow RGB inside original silhouette',
    ...(options.lightingOnly ? { lighting: { blurSigmaPx: 3, maximumRgbDelta: options.lightLimit, reference: 'first Flow frame' } } : {}),
    alpha: 'Exact alpha of the source resized to 720×720; stored as grayscale color, not PNG alpha.',
    motionMask: { mode: options.interiorMotion ? 'alpha-weighted internal ROI; no hole dilation' : 'eroded opaque interior',
      opaqueThreshold: options.interiorMotion ? 200 : 250, preservedRimPx: options.interiorMotion ? 0 : 2,
      featherPx: options.interiorMotion ? 0 : 3, region: options.motionRegion || null, regionFeatherPx: 8 },
    seam: { fadeSeconds: 0.25, firstAndLastFrame: 'original RGB before lossy H.264 encoding', boundaryFadeQp: 18 },
    drift: { detection: 'Coarse gradient registration, 4px resolution; diagnostic only, no stabilization applied.', maxTranslationPx: maxTranslation,
      originalAlignment: { dxPx: originalAlignment.dx * 4, dyPx: originalAlignment.dy * 4, correlation: Number(originalAlignment.score.toFixed(3)) }, sampled },
    warnings,
  };
  if (!options.allowDrift && (maxTranslation > options.maxDrift || initialTranslation > options.maxDrift)) {
    const error = new Error('Object registration failed. Review the raw clip; regenerate instead of hiding movement. --allow-drift explicitly overrides this QA gate.');
    error.report = report; error.exitCode = 2; throw error;
  }
  const parent = path.dirname(options.out);
  await fsp.mkdir(parent, { recursive: true });
  const temporary = await fsp.mkdtemp(path.join(parent, '.object-loop-'));
  const created = [];
  try {
    const inTemp = (name) => path.join(temporary, name);
    await sharp(rgb, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png().toFile(inTemp('rgb.png'));
    const motion = options.interiorMotion
      ? interiorMotionMask(alpha, SIZE, SIZE, options.motionRegion)
      : restrictMotionRegion(interiorMask(alpha, SIZE, SIZE), SIZE, SIZE, options.motionRegion);
    await sharp(motion, { raw: { width: SIZE, height: SIZE, channels: 1 } }).png().toFile(inTemp('motion.png'));
    await sharp(alpha, { raw: { width: SIZE, height: SIZE, channels: 1 } }).png().toFile(inTemp('alpha.png'));
    await sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } }).webp({ lossless: true }).toFile(inTemp('poster.webp'));
    const progress = `clip(min(T/0.25,(${lastFrameTime.toFixed(8)}-T)/0.25),0,1)`;
    const mix = `st(0,${progress});st(1,ld(0)*ld(0)*(3-2*ld(0)));A*ld(1)+B*(1-ld(1))`;
    const extraInputs = [];
    let sourceFilter;
    if (options.lightingOnly) {
      await run(options.ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-noautorotate', '-i', options.video, '-an', '-sn', '-dn',
        '-vf', `crop=720:720:280:0,fps=${FPS},format=gbrp,gblur=sigma=3:steps=2`, '-frames:v', '1', '-n', inTemp('flow-first-blurred.png')]);
      extraInputs.push('-loop', '1', '-framerate', String(FPS), '-i', inTemp('flow-first-blurred.png'));
      const [red, green, blue] = options.lightLimit;
      sourceFilter = `[0:v]crop=720:720:280:0,fps=${FPS},tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=${frames},setpts=PTS-STARTPTS,format=gbrp,gblur=sigma=3:steps=2[flow];`
        + '[1:v]format=gbrp,split=3[base][still][original];[2:v]format=gbrp[mask];[3:v]format=gbrp[reference];'
        + '[flow][reference]blend=all_mode=grainextract:shortest=1[delta];'
        + `[delta]lutrgb=r='clip(val,${128 - red},${128 + red})':g='clip(val,${128 - green},${128 + green})':b='clip(val,${128 - blue},${128 + blue})'[bounded];`
        + '[original][bounded]blend=all_mode=grainmerge:shortest=1[video];';
    } else {
      sourceFilter = `[0:v]crop=720:720:280:0,fps=${FPS},tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=${frames},setpts=PTS-STARTPTS,format=gbrp[video];`
        + '[1:v]format=gbrp,split[base][still];[2:v]format=gbrp[mask];';
    }
    const filter = sourceFilter
      + `[video][still]blend=all_expr='${mix}':shortest=1:enable='lt(t,0.25)+gt(t,${(lastFrameTime - 0.25).toFixed(8)})'[animated];`
      + '[base][animated][mask]maskedmerge=planes=7,format=yuv420p[out]';
    await run(options.ffmpeg, ['-nostdin', '-hide_banner', '-v', 'error', '-threads', '2', '-noautorotate', '-i', options.video,
      '-loop', '1', '-framerate', String(FPS), '-i', inTemp('rgb.png'), '-loop', '1', '-framerate', String(FPS), '-i', inTemp('motion.png'),
      ...extraInputs,
      '-filter_complex_threads', '2', '-filter_complex', filter, '-map', '[out]', '-an', '-sn', '-dn', '-frames:v', String(frames),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(options.crf), '-profile:v', 'high', '-level:v', '3.1', '-pix_fmt', 'yuv420p',
      '-g', '48', '-force_key_frames', `0,${lastFrameTime.toFixed(8)}`, '-x264-params', `zones=0,6,q=18/${Math.max(7, frames - 7)},${frames - 1},q=18`,
      '-movflags', '+faststart', '-map_metadata', '-1', '-threads', '2', '-n', inTemp('loop.mp4')], 1024 * 1024, 300_000);
    const encodedFrames = await run(options.ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-i', inTemp('loop.mp4'),
      '-vf', `scale=${QA_SIZE}:${QA_SIZE}:flags=area,format=rgb24`, '-an', '-f', 'rawvideo', 'pipe:1'], frames * QA_SIZE * QA_SIZE * 3 + 1024);
    report.seam.encodedQA = temporalStats(encodedFrames, alphaSmall, QA_SIZE, QA_SIZE);
    if (Math.abs(report.seam.encodedQA.wrap.brightnessDelta) > 1) warnings.push('The encoded loop has a measurable brightness step; review playback before publication.');
    if (report.seam.encodedQA.wrap.mae > Math.max(2, report.seam.encodedQA.maximumAdjacent * 1.5)) warnings.push('The encoded wrap differs more than normal adjacent frames; inspect the seam before publication.');
    await fsp.writeFile(inTemp('qa.json'), JSON.stringify(report, null, 2));
    const sources = { video: 'loop.mp4', alpha: 'alpha.png', poster: 'poster.webp', report: 'qa.json' };
    for (const [key, target] of Object.entries(targets)) {
      await fsp.copyFile(inTemp(sources[key]), target, fs.constants.COPYFILE_EXCL);
      created.push(target);
    }
  } catch (error) {
    for (const target of created) await fsp.unlink(target).catch(() => {});
    throw error;
  } finally {
    // Only this call's generated scratch directory can be removed.
    if (path.dirname(path.resolve(temporary)) === path.resolve(parent) && path.basename(temporary).startsWith('.object-loop-')) {
      await fsp.rm(temporary, { recursive: true, force: true });
    }
  }
  return { status: 'prepared', outputs: targets, bytes: (await fsp.stat(targets.video)).size, warnings, maxTranslationPx: maxTranslation };
}

if (require.main === module) {
  (async () => {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node scripts/prepare-object-loop.cjs --original image.webp --video flow.mp4 --out output/name [--motion-region x,y,width,height] [--interior-motion] [--lighting-only] [--light-limit 8 | 8,20,8] [--crf 22] [--max-drift 4] [--allow-drift] [--ffmpeg path] [--ffprobe path]\nCreates name.mp4, name-alpha.png, name-poster.webp and name-qa.json. Existing outputs are never overwritten. Motion-region freezes pixels outside a feathered rectangle. Interior-motion requires a region, uses original alpha without expanding tiny holes, and excludes source alpha below200; the output alpha is unchanged. Lighting-only preserves the original geometry and borrows only a bounded RGB lighting delta from Flow.');
      return;
    }
    console.log(JSON.stringify(await prepare(options), null, 2));
  })().catch((error) => {
    console.error(JSON.stringify({ status: 'failed', error: error.message, ...(error.report ? { qa: error.report } : {}) }, null, 2));
    process.exitCode = error.exitCode || 1;
  });
}

module.exports = { interiorMask, interiorMotionMask, smoothstep, seamWeight, estimateShift, temporalStats, parseLightLimit, parseMotionRegion, restrictMotionRegion, parseArgs, prepare };
