#!/usr/bin/env node
'use strict';

// Reuse only an explicitly approved prefix of a generated clip. No optical-flow
// interpolation or frame blending: every output frame is one complete source frame.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');

const FPS = 24;
const FRAME_COUNT = 144;
const MAX_BUFFER_BYTES = 128 * 1024 * 1024;
const SEGMENTS = [
  { name: 'initial hold', frames: 18, direction: 'hold-start' },
  { name: 'forward', frames: 36, direction: 'up' },
  { name: 'peak hold', frames: 18, direction: 'hold-end' },
  { name: 'reverse', frames: 36, direction: 'down' },
  { name: 'final hold', frames: 36, direction: 'hold-start' },
];

function buildSchedule(lastSourceFrame = 18) {
  if (!Number.isInteger(lastSourceFrame) || lastSourceFrame < 1 || lastSourceFrame > 48) {
    throw new Error('Last source frame must be an integer from 1 to 48.');
  }
  const schedule = [];
  for (const segment of SEGMENTS) {
    for (let frame = 0; frame < segment.frames; frame += 1) {
      const eased = (1 - Math.cos(Math.PI * frame / (segment.frames - 1))) / 2;
      const progress = segment.direction === 'up' ? eased : segment.direction === 'down' ? 1 - eased
        : segment.direction === 'hold-end' ? 1 : 0;
      schedule.push(Math.max(0, Math.min(lastSourceFrame, Math.round(progress * lastSourceFrame))));
    }
  }
  return schedule;
}

function capture(command, args, maximumBytes, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    let bytes = 0;
    let errorOutput = '';
    let failure;
    const timer = setTimeout(() => { failure = new Error('Media subprocess timed out.'); child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maximumBytes) { failure = new Error('Decoded data exceeds the approved frame buffer.'); child.kill('SIGKILL'); }
      else chunks.push(chunk);
    });
    child.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk).slice(-4000); });
    child.once('error', (error) => { clearTimeout(timer); reject(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (failure || code !== 0) reject(failure || new Error(errorOutput || `Media subprocess exited ${code}.`));
      else resolve(Buffer.concat(chunks, bytes));
    });
  });
}

async function hashFile(filename) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filename)) hash.update(chunk);
  return hash.digest('hex');
}

async function writeVideo(ffmpeg, output, sourceFrames, schedule, width, height) {
  const frameBytes = width * height * 3;
  const child = spawn(ffmpeg, ['-nostdin', '-hide_banner', '-v', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24',
    '-video_size', `${width}x${height}`, '-framerate', String(FPS), '-i', 'pipe:0', '-an',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-threads', '2', '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_range', 'tv', '-g', '48', '-movflags', '+faststart', '-map_metadata', '-1', '-n', output],
  { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] });
  let errorOutput = '';
  let timedOut = false;
  child.stdin.on('error', () => {});
  child.stderr.on('data', (chunk) => { errorOutput = (errorOutput + chunk).slice(-4000); });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 180_000);
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(timedOut ? 'Encoder timed out.' : errorOutput || `Encoder exited ${code}.`)));
  });
  completion.catch(() => {});
  try {
    for (const index of schedule) {
      const frame = sourceFrames.subarray(index * frameBytes, (index + 1) * frameBytes);
      if (frame.length !== frameBytes) throw new Error('Schedule requested a missing source frame.');
      // The callback bounds pending writes; no 144-frame output buffer is allocated.
      await new Promise((resolve, reject) => child.stdin.write(frame, (error) => error ? reject(error) : resolve()));
    }
    child.stdin.end();
    await completion;
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

async function retime({ source, output, ffmpeg = 'ffmpeg', ffprobe = 'ffprobe', lastSourceFrame = 18 }) {
  const schedule = buildSchedule(lastSourceFrame);
  source = path.resolve(source);
  output = path.resolve(output);
  const reportPath = output.replace(/\.mp4$/i, '') + '-retime-qa.json';
  if (source === output || !output.toLowerCase().endsWith('.mp4')) throw new Error('Choose a separate .mp4 output.');
  for (const target of [output, reportPath]) if (fs.existsSync(target)) throw new Error(`Refusing to overwrite ${target}`);
  const probeArgs = ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,pix_fmt,nb_frames:format=duration', '-of', 'json'];
  const metadata = JSON.parse(await capture(ffprobe, [...probeArgs, source], 64 * 1024));
  const video = metadata.streams.find((stream) => stream.codec_type === 'video');
  if (!video || video.width !== 1280 || video.height !== 720 || video.r_frame_rate !== '24/1') {
    throw new Error('Expected the approved 1280x720, 24 fps Flow source.');
  }
  const frameBytes = video.width * video.height * 3;
  const approvedBytes = (lastSourceFrame + 1) * frameBytes;
  if (approvedBytes > MAX_BUFFER_BYTES) throw new Error('Approved prefix exceeds the 128 MiB memory cap.');
  // trim and frames:v independently limit the only frames available to the schedule.
  // Decoder may read reference packets, but no later display frame enters our buffer.
  const frames = await capture(ffmpeg, ['-nostdin', '-v', 'error', '-threads', '2', '-i', source, '-map', '0:v:0',
    '-vf', `trim=start_frame=0:end_frame=${lastSourceFrame + 1},format=rgb24`, '-frames:v', String(lastSourceFrame + 1),
    '-an', '-f', 'rawvideo', 'pipe:1'], approvedBytes);
  if (frames.length !== approvedBytes) throw new Error('Source did not contain the full approved prefix.');
  const directory = path.dirname(output);
  await fsp.mkdir(directory, { recursive: true });
  const temporary = await fsp.mkdtemp(path.join(directory, '.retime-'));
  const created = [];
  try {
    const tempVideo = path.join(temporary, 'loop.mp4');
    await writeVideo(ffmpeg, tempVideo, frames, schedule, video.width, video.height);
    const result = JSON.parse(await capture(ffprobe, [...probeArgs, tempVideo], 64 * 1024));
    const encoded = result.streams.find((stream) => stream.codec_type === 'video');
    if (encoded?.nb_frames !== String(FRAME_COUNT) || Number(result.format.duration) !== 6
        || result.streams.some((stream) => stream.codec_type === 'audio')) throw new Error('Encoded clip failed duration/frame/audio verification.');
    const report = {
      source, sourceSha256: await hashFile(source), output, outputSha256: await hashFile(tempVideo),
      approvedSourceFramesInclusive: [0, lastSourceFrame], approvedSourceSecondsInclusive: [0, lastSourceFrame / FPS],
      dimensions: [video.width, video.height], fps: FPS, frames: FRAME_COUNT, seconds: 6, audio: false,
      method: 'Nearest complete source frame; half-cosine forward/reverse segments; no interpolation, optical flow, blending or later source frames.',
      encoding: 'Intermediate H.264 CRF12, yuv420p, BT.709 RGB/YUV matrix, faststart; lossy intermediate, not a new motion generation.',
      segments: SEGMENTS.map((segment) => ({ ...segment, seconds: segment.frames / FPS })),
      schedule, firstAndLastSourceFrameIdentical: schedule[0] === schedule.at(-1),
      decodedPrefixBytes: frames.length, outputBytes: (await fsp.stat(tempVideo)).size,
    };
    await fsp.writeFile(path.join(temporary, 'qa.json'), JSON.stringify(report, null, 2));
    for (const [from, to] of [[tempVideo, output], [path.join(temporary, 'qa.json'), reportPath]]) {
      await fsp.copyFile(from, to, fs.constants.COPYFILE_EXCL);
      created.push(to);
    }
    return { output, report: reportPath, bytes: report.outputBytes, frames: FRAME_COUNT, approvedSourceFramesInclusive: report.approvedSourceFramesInclusive };
  } catch (error) {
    for (const target of created) await fsp.unlink(target).catch(() => {});
    throw error;
  } finally {
    if (path.dirname(path.resolve(temporary)) === directory && path.basename(temporary).startsWith('.retime-')) {
      await fsp.rm(temporary, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  const options = { source: path.resolve(__dirname, '../output/flow-muvs-v2/music-v2-raw.mp4'), output: path.resolve(__dirname, '../output/flow-muvs-v2/music-v2-retimed.mp4'), ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg' };
  (async () => {
    for (let i = 2; i < process.argv.length; i += 1) {
      const field = { '--source': 'source', '--output': 'output', '--ffmpeg': 'ffmpeg', '--ffprobe': 'ffprobe', '--last-source-frame': 'lastSourceFrame' }[process.argv[i]];
      if (!field || !process.argv[i + 1]) throw new Error('Usage: node scripts/retime-object-motion.cjs [--source source.mp4] [--output loop.mp4] [--last-source-frame 18] [--ffmpeg executable] [--ffprobe executable]');
      options[field] = field === 'lastSourceFrame' ? Number(process.argv[++i]) : process.argv[++i];
    }
    options.ffprobe ||= path.basename(options.ffmpeg).toLowerCase() === 'ffmpeg.exe' ? path.join(path.dirname(options.ffmpeg), 'ffprobe.exe') : 'ffprobe';
    console.log(JSON.stringify(await retime(options), null, 2));
  })().catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { buildSchedule, SEGMENTS, retime };
