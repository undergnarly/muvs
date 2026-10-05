import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    applyTitleGlyphStretch, createMenuTitleStretch, measureTitleGlyphs,
    menuTitleTargetWidth, titleStretchStrength, warpTitleCoordinate,
} from './menuTitleStretch.js';

const frame = { delta: 0.02, index: 0, mobile: true, menu: true, ready: true, settled: true, visible: true, skip: false };

test('selection stretches immediately before camera settles and finishes in one second', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, ready: false }), 0);
    let previous = timeline.sample({ ...frame, settled: false });
    assert.ok(previous > 0);
    for (let i = 1; i < 50; i++) {
        const progress = timeline.sample({ ...frame, settled: false });
        assert.ok(progress >= previous && progress <= 1);
        previous = progress;
        if (i < 49) assert.ok(progress < 1);
    }
    assert.equal(previous, 1);
    assert.equal(timeline.sample(frame), 1);
});

test('scroll/travel/section and same-selection return retain the distorted glyph snapshot', () => {
    const timeline = createMenuTitleStretch();
    for (let i = 0; i < 10; i++) timeline.sample(frame);
    const beforeTravel = timeline.progress;
    assert.ok(timeline.sample({ ...frame, menu: false, phase: 'travel' }) > beforeTravel);
    for (let i = 0; i < 40; i++) timeline.sample({ ...frame, menu: false, phase: 'section' });
    assert.equal(timeline.progress, 1);
    assert.equal(timeline.progressFor(0), 1);
    assert.equal(timeline.sample({ ...frame, menu: false, phase: 'foreign' }), 1);
    assert.equal(timeline.sample(frame), 1);
});

test('new logical selection replays incoming only and preserves outgoing ring copies', () => {
    const timeline = createMenuTitleStretch();
    for (let i = 0; i < 20; i++) timeline.sample(frame);
    const outgoing = timeline.progressFor(0);
    const incoming = timeline.sample({ ...frame, index: 1, settled: false });
    assert.ok(incoming > 0 && incoming < outgoing);
    assert.equal(timeline.progressFor(0), outgoing);
    assert.equal(timeline.progressFor(1), incoming);
    for (let i = 0; i < 50; i++) timeline.sample({ ...frame, index: 1 });
    assert.equal(timeline.progressFor(1), 1);
    assert.equal(timeline.progressFor(0), outgoing);
});

test('hidden time freezes and desktop is never stretched without clearing mobile snapshots', () => {
    const timeline = createMenuTitleStretch();
    for (let i = 0; i < 25; i++) timeline.sample(frame);
    const progress = timeline.progress;
    assert.ok(progress > 0);
    for (let i = 0; i < 100; i++) assert.equal(timeline.sample({ ...frame, visible: false }), progress);
    assert.equal(timeline.visible, false);
    assert.ok(timeline.sample(frame) > progress);
    assert.equal(timeline.visible, true);
    assert.equal(timeline.sample({ ...frame, mobile: false }), 0);
    assert.equal(timeline.progressFor(0), 0);
    assert.equal(timeline.sample({ ...frame, skip: true }), 1);
    assert.equal(timeline.progressFor(0), 1);
});

test('frame spikes and invalid/negative deltas cannot jump the entrance', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, delta: -10 }), 0);
    assert.equal(timeline.sample({ ...frame, delta: NaN }), 0);
    assert.equal(timeline.sample({ ...frame, delta: Infinity }), 0);
    const progress = timeline.sample({ ...frame, delta: 30 });
    assert.ok(progress > 0 && progress < 0.15);
});

test('reduced motion and Save Data finish statically and an initial return transition can start', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, menu: false, phase: 'section' }), 0);
    assert.ok(timeline.sample({ ...frame, menu: false, phase: 'foreign', settled: false }) > 0);
    assert.equal(timeline.sample({ ...frame, menu: false, phase: 'travel', skip: true }), 1);
    assert.equal(timeline.sample({ ...frame, index: 2, menu: false, phase: 'travel', skip: true }), 1);
    assert.equal(timeline.progressFor(0), 1);
    assert.equal(timeline.progressFor(2), 1);
});

test('80vw target uses the final tuned hub pose including title depth and camera pitch', () => {
    const hub = { camDistMobile: 9, camY: 3, lookY: 2.3, itemY: 2.5, fov: 47 };
    const aspect = 390 / 844;
    const target = menuTitleTargetWidth(hub, aspect);
    const drop = hub.camY - hub.lookY;
    const pitch = Math.atan2(drop, hub.camDistMobile);
    const depth = (hub.camDistMobile + 1.2) * Math.cos(pitch) + (hub.camY - hub.itemY - 2.25) * Math.sin(pitch);
    const projectedFraction = target / (2 * depth * Math.tan(hub.fov * Math.PI / 360) * aspect);
    assert.ok(Math.abs(projectedFraction - 0.8) < 1e-12);
    assert.ok(menuTitleTargetWidth(hub, 320 / 740) < target);
    assert.ok(Number.isFinite(menuTitleTargetWidth({ fov: NaN, camDistMobile: Infinity }, NaN)));
});

test('Bebas Neue is an unmodified static self-hosted font with its OFL and label-only wiring', () => {
    const font = readFileSync(new URL('../assets/fonts/BebasNeue-Regular.ttf', import.meta.url));
    assert.equal(font.readUInt32BE(0), 0x00010000);
    const tables = [];
    for (let i = 0; i < font.readUInt16BE(4); i++) tables.push(font.toString('ascii', 12 + i * 16, 16 + i * 16));
    assert.ok(tables.includes('name'));
    assert.ok(!tables.includes('fvar'));
    assert.match(readFileSync(new URL('../assets/fonts/BebasNeue-OFL.txt', import.meta.url), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
    const fontModule = readFileSync(new URL('../data/menuFonts.js', import.meta.url), 'utf8');
    assert.match(fontModule, /BebasNeue-Regular\.ttf\?inline/);
    assert.match(fontModule, /export const FONT_BOLD = boldFont/);
    const headerCss = readFileSync(new URL('../components/layout/Header.css', import.meta.url), 'utf8');
    assert.match(headerCss, /BebasNeue-Regular\.ttf\?inline/);
    assert.match(headerCss, /\.staggered-menu-wrapper \.sm-panel-itemLabel/);
    assert.doesNotMatch(headerCss, /\.sm-toggle[^}]+font-family/s);
});

test('convex symmetric warp preserves center and increases edge-glyph width progressively', () => {
    const center = 0;
    const half = 2;
    const strength = 0.7;
    assert.equal(warpTitleCoordinate(0, center, half, strength), 0);
    assert.equal(warpTitleCoordinate(-2, center, half, strength), -warpTitleCoordinate(2, center, half, strength));
    const width = (x) => warpTitleCoordinate(x + 0.1, center, half, strength)
        - warpTitleCoordinate(x - 0.1, center, half, strength);
    assert.ok(width(0) < 0.201);
    assert.ok(width(0.8) > width(0));
    assert.ok(width(1.8) > width(0.8));
    assert.equal(warpTitleCoordinate(2, 0, 0, 1), 2);
});

test('SDF bounds change only x, do not mutate the source and match the requested visible width', () => {
    const bounds = new Float32Array([-2.2, -0.1, -0.8, 1.1, -0.7, -0.1, 0.7, 1.1, 0.8, -0.1, 2.2, 1.1]);
    const original = bounds.slice();
    const visible = [-2, 0, 2, 1];
    const metrics = measureTitleGlyphs(bounds, visible);
    const target = bounds.slice();
    const strength = titleStretchStrength(metrics, 6, 1);
    applyTitleGlyphStretch(target, metrics, strength);
    const left = target[0] + (target[2] - target[0]) * ((-2 - bounds[0]) / (bounds[2] - bounds[0]));
    const right = target[8] + (target[10] - target[8]) * ((2 - bounds[8]) / (bounds[10] - bounds[8]));
    assert.ok(Math.abs(right - left - 6) < 0.000001);
    assert.deepEqual(bounds, original);
    for (let i = 0; i < bounds.length; i += 4) {
        assert.equal(target[i + 1], bounds[i + 1]);
        assert.equal(target[i + 3], bounds[i + 3]);
        assert.ok(target[i + 2] > target[i]);
    }
    assert.equal(target[4], -target[6]);
    applyTitleGlyphStretch(target, metrics, 0);
    assert.deepEqual(target, original);
});

test('already-wide titles are never compressed and missing metrics leave fonts untouched', () => {
    const metrics = measureTitleGlyphs(new Float32Array([-2, 0, 2, 1]), [-2, 0, 2, 1]);
    assert.equal(titleStretchStrength(metrics, 3, 1), 0);
    assert.equal(titleStretchStrength(metrics, NaN, 1), 0);
    assert.equal(measureTitleGlyphs([], [0, 0, 0, 0]), null);
    assert.equal(measureTitleGlyphs(new Float32Array([-2, 0, 2, 1]), [0, 0, 0, 0]), null);
});
