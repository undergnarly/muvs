#!/usr/bin/env node
'use strict';

// Offline preparation only. The browser loads the five MP3s only after opt-in.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const cache = path.join(root, 'output/menu-audio-sources');
const out = path.join(root, 'public/audio/menu');
const serverRequire = createRequire(path.join(root, 'server/package.json'));
const ffmpeg = process.env.FFMPEG_PATH || serverRequire('ffmpeg-static');
const RATE = 44100;
const CHANNELS = 2;
const sources = [
  {
    file: 'heavenly-loop.flac',
    url: 'https://opengameart.org/sites/default/files/Heavenly%20Loop.flac',
    sha256: '1324464c995635ce1a7833c5b3f33eba7356b60e17e802ebbf286bd1abe0a5a4',
  },
  {
    file: 'kenney-interface-sounds.zip',
    url: 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip',
    sha256: 'f2193d072726d6758a5f7871b2dcc54dcce0d5c35c6f0a62f92549b327c81232',
    folder: 'kenney',
  },
  {
    file: 'rubberduck-curl.zip',
    url: 'https://opengameart.org/sites/default/files/sfx_100_v2.zip',
    sha256: '0fc61b4494e2e893c0c015ced4877b3f689c7d84a48cb61daecd7ddb52db797b',
    folder: 'rubberduck',
  },
];

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function ff(args, input) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], {
    input,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error) {
    throw result.error || new Error(result.stderr.toString() || `ffmpeg exited ${result.status}`);
  }
  return result.stdout;
}

function decode(file, filter = 'anull') {
  const data = ff(['-i', file, '-af', filter, '-ar', String(RATE), '-ac', String(CHANNELS), '-f', 'f32le', 'pipe:1']);
  const samples = new Float32Array(data.length / 4);
  for (let i = 0; i < samples.length; i++) samples[i] = data.readFloatLE(i * 4);
  return samples;
}

function bufferOf(samples) {
  const data = Buffer.allocUnsafe(samples.length * 4);
  for (let i = 0; i < samples.length; i++) data.writeFloatLE(samples[i], i * 4);
  return data;
}

function db(value) {
  return value > 0 ? 20 * Math.log10(value) : -120;
}

function analyze(samples) {
  let sum = 0;
  let peak = 0;
  let clipped = 0;
  let diff = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    sum += value * value;
    peak = Math.max(peak, Math.abs(value));
    if (Math.abs(value) >= 1) clipped++;
    if (i >= CHANNELS) diff += (value - samples[i - CHANNELS]) ** 2;
  }
  let seam = 0;
  for (let c = 0; c < CHANNELS; c++) {
    seam = Math.max(seam, Math.abs(samples[c] - samples[samples.length - CHANNELS + c]));
  }
  return {
    duration: samples.length / CHANNELS / RATE,
    peakDbfs: Number(db(peak).toFixed(3)),
    rmsDbfs: Number(db(Math.sqrt(sum / samples.length)).toFixed(3)),
    clippedSamples: clipped,
    adjacentDifferenceRms: Number(Math.sqrt(diff / (samples.length - CHANNELS)).toFixed(8)),
    loopBoundaryMaxDifference: Number(seam.toFixed(8)),
  };
}

function normalize(samples, targetRms = -22, maxPeak = -6.5) {
  const analysis = analyze(samples);
  const gain = Math.min(10 ** ((targetRms - analysis.rmsDbfs) / 20), 10 ** ((maxPeak - analysis.peakDbfs) / 20));
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}

function circularBlend(samples, seconds, crossfade) {
  const frames = Math.round(seconds * RATE);
  const fadeFrames = Math.round(crossfade * RATE);
  if (samples.length < (frames + fadeFrames) * CHANNELS) throw new Error('Not enough loop source');
  const loop = samples.slice(0, frames * CHANNELS);
  for (let frame = 0; frame < fadeFrames; frame++) {
    // First two seconds connect the natural source tail to its beginning.
    const blend = frame / fadeFrames;
    const weight = blend * blend * (3 - 2 * blend);
    for (let channel = 0; channel < CHANNELS; channel++) {
      const index = frame * CHANNELS + channel;
      loop[index] = samples[(frames + frame) * CHANNELS + channel] * (1 - weight) + samples[index] * weight;
    }
  }
  return loop;
}

function addSoftVinyl(samples) {
  let state = 0x4d555653;
  let low = 0;
  let slow = 0;
  for (let frame = 0; frame < samples.length / CHANNELS; frame++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const white = state / 0x80000000 - 1;
    low += (white - low) * 0.35;
    slow += (low - slow) * 0.045;
    // Original, seeded band-limited hiss; no full-scale crackles or repeated hard clicks.
    const noise = (low - slow) * 0.0024;
    samples[frame * CHANNELS] += noise;
    samples[frame * CHANNELS + 1] += noise * 0.88;
  }
  return samples;
}

function encode(name, samples, bitrate, sourceNames, purpose) {
  const file = path.join(out, name);
  ff(['-f', 'f32le', '-ar', String(RATE), '-ac', String(CHANNELS), '-i', 'pipe:0',
    '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', bitrate, '-ar', String(RATE),
    '-write_xing', '1', '-id3v2_version', '3', '-y', file], bufferOf(samples));
  const decoded = decode(file);
  const data = fs.readFileSync(file);
  const result = {
    file: name,
    url: `/audio/menu/${name}`,
    bytes: data.length,
    sha256: hash(data),
    sources: sourceNames,
    purpose,
    ...analyze(decoded),
  };
  if (name === 'menu-pad.mp3') {
    result.loopStart = 0;
    result.loopEnd = 24;
    if (Math.abs(result.duration - 24) > 1 / RATE) throw new Error('MP3 decoded loop duration is not exactly 24 seconds');
  }
  if (result.clippedSamples || result.peakDbfs > -5) throw new Error(`Unsafe output level for ${name}`);
  return result;
}

function verify() {
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  let total = 0;
  for (const expected of manifest.assets) {
    const file = path.join(out, expected.file);
    const data = fs.readFileSync(file);
    const actual = analyze(decode(file));
    if (hash(data) !== expected.sha256 || data.length !== expected.bytes) throw new Error(`Asset integrity mismatch: ${expected.file}`);
    if (actual.clippedSamples || actual.peakDbfs > -5) throw new Error(`Unsafe audio level: ${expected.file}`);
    if (Math.abs(actual.duration - expected.duration) > 1 / RATE) throw new Error(`Unexpected duration: ${expected.file}`);
    if (expected.loopEnd && (actual.duration !== 24 || actual.loopBoundaryMaxDifference > actual.adjacentDifferenceRms)) {
      throw new Error('Pad loop seam is larger than the ordinary PCM difference');
    }
    total += data.length;
  }
  if (total !== manifest.totalBytes || total > 300000) throw new Error('Invalid audio payload budget');
  return { verifiedAssets: manifest.assets.length, totalBytes: total };
}

async function acquire() {
  fs.mkdirSync(cache, { recursive: true });
  fs.mkdirSync(out, { recursive: true });
  for (const source of sources) {
    const file = path.join(cache, source.file);
    if (!fs.existsSync(file) || hash(fs.readFileSync(file)) !== source.sha256) {
      const response = await fetch(source.url, { signal: AbortSignal.timeout(180000) });
      if (!response.ok) throw new Error(`Download failed ${response.status}: ${source.url}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > 10 * 1024 * 1024 || hash(data) !== source.sha256) throw new Error(`Unexpected source hash: ${source.file}`);
      fs.writeFileSync(file, data);
    }
    if (source.folder && !fs.existsSync(path.join(cache, source.folder))) {
      const destination = path.join(cache, source.folder);
      const result = process.platform === 'win32'
        ? spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
          `Expand-Archive -LiteralPath '${file.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`], { windowsHide: true })
        : spawnSync('unzip', ['-q', file, '-d', destination]);
      if (result.status !== 0) throw new Error(`Could not extract ${source.file}: ${result.stderr}`);
    }
  }
}

async function main() {
  await acquire();
  const rubber = (name) => path.join(cache, 'rubberduck', `sfx100v2_${name}.ogg`);
  const kenney = (name) => path.join(cache, 'kenney/Audio', `${name}.ogg`);
  const ambientSource = decode(path.join(cache, 'heavenly-loop.flac'),
    'asetrate=39690,aresample=44100,highpass=f=60,lowpass=f=1500,atrim=start=4:duration=26,asetpts=PTS-STARTPTS');
  const pad = normalize(circularBlend(addSoftVinyl(ambientSource), 24, 2), -23, -7);
  const results = [encode('menu-pad.mp3', pad, '64k', ['isaiah658 / Heavenly Loop', 'MUVS original seeded vinyl hiss'],
    'Warm, low-passed pad; no drums or lead; circular two-second overlap, menu only')];
  const specs = [
    ['music-transition.mp3', rubber('air_03'), 'asetrate=35280,aresample=44100,highpass=f=90,lowpass=f=2400,apad=whole_dur=0.52,atrim=duration=0.52,afade=t=in:d=0.012,afade=t=out:st=0.25:d=0.27',
      ['rubberduck / sfx100v2_air_03.ogg'], 'Soft, low airy movement for the soundsystem'],
    ['mixes-transition.mp3', rubber('metal_01'), 'asetrate=35280,aresample=44100,highpass=f=180,lowpass=f=2100,apad=whole_dur=0.7,atrim=duration=0.7,afade=t=in:d=0.018,afade=t=out:st=0.32:d=0.38',
      ['rubberduck / sfx100v2_metal_01.ogg'], 'Restrained softened metal texture for the bronze DJ'],
    ['code-transition.mp3', kenney('glass_006'), 'asetrate=35280,aresample=44100,highpass=f=180,lowpass=f=3400,aecho=0.7:0.3:62:0.18,apad=whole_dur=0.4,atrim=duration=0.4,afade=t=in:d=0.006,afade=t=out:st=0.12:d=0.28',
      ['Kenney / glass_006.ogg'], 'Short clean glass-like digital cue, gently damped'],
    ['about-transition.mp3', rubber('air_02'), 'atrim=start=0.1:duration=0.65,asetpts=PTS-STARTPTS,asetrate=39690,aresample=44100,highpass=f=120,lowpass=f=1400,apad=whole_dur=0.72,atrim=duration=0.72,afade=t=in:d=0.035,afade=t=out:st=0.22:d=0.5',
      ['rubberduck / sfx100v2_air_02.ogg'], 'Quiet diffuse air, without an extra melody'],
  ];
  for (const [name, input, filter, credits, purpose] of specs) {
    results.push(encode(name, normalize(decode(input, filter), -22, -7), '96k', credits, purpose));
  }
  const manifest = {
    format: 'MUVS menu sound sketch v1',
    sampleRate: RATE,
    channels: CHANNELS,
    license: 'CC0-1.0; original MUVS processing and noise',
    totalBytes: results.reduce((sum, asset) => sum + asset.bytes, 0),
    assets: results,
  };
  if (manifest.totalBytes > 300000) throw new Error('Menu audio exceeds the 300 KB opt-in budget');
  fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

module.exports = { analyze, normalize, circularBlend, verify };

if (require.main === module) {
  (process.argv.includes('--verify') ? Promise.resolve().then(verify).then(console.log) : main())
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
