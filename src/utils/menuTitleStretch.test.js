import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    MENU_TITLE_STRETCH_DURATION, MENU_TITLE_VIEWPORT_FRACTION,
    applyTitleGlyphStretch, createMenuTitleStretch, measureTitleGlyphs,
    menuTitleTargetWidth, titleStretchStrength, warpTitleCoordinate,
} from './menuTitleStretch.js';

const frame = { delta: 0.02, index: 0, mobile: true, menu: true, ready: true, settled: true, visible: true, skip: false };
const introFrames = Math.round(MENU_TITLE_STRETCH_DURATION / frame.delta);

const close = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`);
const advance = (timeline, seconds, overrides = {}) => {
    for (let i = 0; i < Math.round(seconds / frame.delta); i++) timeline.sample({ ...frame, ...overrides });
};

test('selection stretches immediately before camera settles and finishes in 1.5 seconds', () => {
    const timeline = createMenuTitleStretch();
    assert.equal(timeline.sample({ ...frame, ready: false }), 0);
    let previous = timeline.sample({ ...frame, settled: false });
    assert.ok(previous > 0);
    for (let i = 1; i < introFrames; i++) {
        const progress = timeline.sample({ ...frame, settled: false });
        assert.ok(progress >= previous && progress <= 1);
        previous = progress;
        if (i < introFrames - 1) assert.ok(progress < 1);
    }
    assert.equal(previous, 1);
    assert.equal(timeline.sample(frame), 1);
});

test('scroll/travel/section and same-selection return retain the distorted glyph snapshot', () => {
    const timeline = createMenuTitleStretch();
    for (let i = 0; i < 10; i++) timeline.sample(frame);
    const beforeTravel = timeline.progress;
    assert.ok(timeline.sample({ ...frame, menu: false, phase: 'travel' }) > beforeTravel);
    for (let i = 0; i < introFrames; i++) timeline.sample({ ...frame, menu: false, phase: 'section' });
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
    for (let i = 0; i < introFrames; i++) timeline.sample({ ...frame, index: 1 });
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

test('milder 74vw target uses the final tuned hub pose including title depth and camera pitch', () => {
    const hub = { camDistMobile: 9, camY: 3, lookY: 2.3, itemY: 2.5, fov: 47 };
    const aspect = 390 / 844;
    const target = menuTitleTargetWidth(hub, aspect);
    const drop = hub.camY - hub.lookY;
    const pitch = Math.atan2(drop, hub.camDistMobile);
    const depth = (hub.camDistMobile + 1.2) * Math.cos(pitch) + (hub.camY - hub.itemY - 2.25) * Math.sin(pitch);
    const projectedFraction = target / (2 * depth * Math.tan(hub.fov * Math.PI / 360) * aspect);
    assert.equal(MENU_TITLE_VIEWPORT_FRACTION, 0.74);
    assert.equal(MENU_TITLE_STRETCH_DURATION, 1.5);
    assert.ok(Math.abs(projectedFraction - 0.74) < 1e-12);
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

test('nonlinear horizontal stretch keeps its center nearly unchanged and expands both edges more', () => {
    const center = 1.5;
    const half = 2;
    const strength = 0.7;
    assert.equal(warpTitleCoordinate(center, center, half, strength), center);
    assert.ok(Math.abs(warpTitleCoordinate(center - 2, center, half, strength)
        + warpTitleCoordinate(center + 2, center, half, strength) - center * 2) < 1e-12);
    const width = (x) => warpTitleCoordinate(x + 0.1, center, half, strength)
        - warpTitleCoordinate(x - 0.1, center, half, strength);
    const centerWidth = width(center);
    assert.ok(centerWidth / 0.2 < 1.002);
    assert.ok(width(center + 0.8) > centerWidth);
    assert.ok(width(center + 1.8) > width(center + 0.8));
    assert.ok(Math.abs(width(center - 1.8) - width(center + 1.8)) < 1e-12);
    assert.ok(Math.abs(width(center - 0.8) - width(center + 0.8)) < 1e-12);
    assert.equal(warpTitleCoordinate(2, 0, 0, 1), 2);
});

test('edge glyphs and gaps expand more than the middle throughout the entrance without inversion', () => {
    const bounds = new Float32Array([-3, 0, -2.4, 1, -2.2, 0, -0.8, 1,
        -0.4, 0, 0.4, 1, 0.8, 0, 1.8, 1, 2, 0, 3, 1]);
    const metrics = measureTitleGlyphs(bounds, [-3, 0, 3, 1]);
    const target = bounds.slice();
    for (const progress of [0, 0.1, 0.5, 1]) {
        const strength = titleStretchStrength(metrics, 9, progress);
        applyTitleGlyphStretch(target, metrics, strength);
        const ratios = [];
        for (let offset = 0; offset < bounds.length; offset += 4) {
            const sourceWidth = bounds[offset + 2] - bounds[offset];
            ratios.push((target[offset + 2] - target[offset]) / sourceWidth);
            assert.ok(target[offset + 2] > target[offset]);
            if (offset + 4 < bounds.length) {
                assert.ok(target[offset + 4] > target[offset + 2]);
            }
        }
        if (progress > 0) {
            assert.ok(ratios[0] > ratios[1] && ratios[1] > ratios[2]);
            assert.ok(ratios[4] > ratios[3] && ratios[3] > ratios[2]);
            assert.ok(ratios[2] < 1.01);
        } else {
            assert.deepEqual(target, bounds);
        }
        assert.ok(Math.abs(target[0] + target[target.length - 2]) < 1e-6);
        close(target[target.length - 2] - target[0], 6 + 3 * progress, 1e-6);
    }
});

test('nonlinear title snapshot survives logical-equivalent physical wraps and interrupted travel', () => {
    for (const [from, to] of [[3, 7], [8, 4]]) {
        const timeline = createMenuTitleStretch();
        const logicalIndex = from % 4;
        for (let i = 0; i < 10; i++) timeline.sample({ ...frame, index: logicalIndex });
        const before = timeline.progressFor(logicalIndex);
        assert.ok(timeline.sample({ ...frame, index: to % 4, menu: false, phase: 'travel' }) > before);
        const travelling = timeline.progress;
        assert.ok(timeline.sample({ ...frame, index: logicalIndex, menu: false, phase: 'travel' }) > travelling);
        const returning = timeline.progress;
        assert.ok(timeline.sample({ ...frame, index: logicalIndex }) > returning);
        assert.equal(timeline.progressFor(logicalIndex), timeline.progress);
    }
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

test('breathing begins smoothly at full width only after the 1.5-second intro completes', () => {
    const timeline = createMenuTitleStretch();
    advance(timeline, MENU_TITLE_STRETCH_DURATION - frame.delta);
    assert.ok(timeline.progress < 1);
    assert.equal(timeline.widthFactorFor(0), 1);
    timeline.sample(frame);
    assert.equal(timeline.progress, 1);
    assert.equal(timeline.widthFactorFor(0), 1);
    timeline.sample({ ...frame, delta: 0 });
    assert.equal(timeline.widthFactorFor(0), 1);
    timeline.sample(frame);
    const first = timeline.widthFactorFor(0);
    close(first, 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 0.02 / 3.8)));
    assert.ok(first < 1 && first > 0.99998);
});

test('breathing has a 3.8-second cosine cycle with zero-velocity ends and no overshoot', () => {
    const timeline = createMenuTitleStretch();
    advance(timeline, MENU_TITLE_STRETCH_DURATION);
    advance(timeline, 0.94);
    const beforeQuarter = timeline.widthFactorFor(0);
    advance(timeline, 0.96);
    close(timeline.widthFactorFor(0), 0.95);
    timeline.sample(frame);
    assert.ok(timeline.widthFactorFor(0) > 0.95 && timeline.widthFactorFor(0) < 0.95002);
    advance(timeline, 1.88);
    close(timeline.widthFactorFor(0), 1);
    assert.ok(beforeQuarter > 0.975 && beforeQuarter < 0.976);
    for (let i = 0; i < 2000; i++) {
        timeline.sample(frame);
        const factor = timeline.widthFactorFor(0);
        assert.ok(factor >= 0.95 && factor <= 1);
    }
});

test('hidden and not-ready time freeze breathing and resumed frame spikes are bounded', () => {
    const timeline = createMenuTitleStretch();
    advance(timeline, MENU_TITLE_STRETCH_DURATION);
    advance(timeline, 0.8);
    const held = timeline.widthFactorFor(0);
    for (let i = 0; i < 100; i++) {
        timeline.sample({ ...frame, visible: false, delta: 100 });
        assert.equal(timeline.widthFactorFor(0), held);
        timeline.sample({ ...frame, ready: false, delta: 100 });
        assert.equal(timeline.widthFactorFor(0), held);
    }
    timeline.sample({ ...frame, delta: 0 });
    assert.equal(timeline.widthFactorFor(0), held);
    timeline.sample({ ...frame, delta: 100 });
    close(timeline.widthFactorFor(0), 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 0.85 / 3.8)));
});

test('travel and section hold the current breath and return resumes without a first-frame jump', () => {
    const timeline = createMenuTitleStretch();
    advance(timeline, MENU_TITLE_STRETCH_DURATION);
    advance(timeline, 1.3);
    const held = timeline.widthFactorFor(0);
    for (const phase of ['travel', 'section', 'foreign']) {
        advance(timeline, 3.8, { menu: false, phase });
        assert.equal(timeline.widthFactorFor(0), held);
    }
    timeline.sample({ ...frame, menu: false, phase: 'travel', delta: 0 });
    assert.equal(timeline.widthFactorFor(0), held);
    timeline.sample({ ...frame, phase: 'menu', delta: 0 });
    assert.equal(timeline.widthFactorFor(0), held);
    timeline.sample({ ...frame, phase: 'menu' });
    close(timeline.widthFactorFor(0), 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 1.32 / 3.8)));

    const interrupted = createMenuTitleStretch();
    advance(interrupted, 0.2);
    advance(interrupted, MENU_TITLE_STRETCH_DURATION, { menu: false, phase: 'travel' });
    assert.equal(interrupted.progress, 1);
    assert.equal(interrupted.widthFactorFor(0), 1);
    interrupted.sample({ ...frame, delta: 0 });
    assert.equal(interrupted.widthFactorFor(0), 1);
    interrupted.sample(frame);
    close(interrupted.widthFactorFor(0), 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 0.02 / 3.8)));
});

test('same logical physical wraps retain breath while a real selection restarts only the incoming word', () => {
    for (const [from, to] of [[3, 7], [8, 4]]) {
        const timeline = createMenuTitleStretch();
        const logicalIndex = from % 4;
        advance(timeline, MENU_TITLE_STRETCH_DURATION, { index: logicalIndex });
        advance(timeline, 1.2, { index: logicalIndex });
        const held = timeline.widthFactorFor(logicalIndex);
        timeline.sample({ ...frame, index: to % 4, delta: 0 });
        assert.equal(timeline.widthFactorFor(logicalIndex), held);
        advance(timeline, 1, { index: to % 4, menu: false, phase: 'travel' });
        assert.equal(timeline.widthFactorFor(logicalIndex), held);
        timeline.sample({ ...frame, index: to % 4, delta: 0 });
        assert.equal(timeline.widthFactorFor(logicalIndex), held);
        timeline.sample({ ...frame, index: to % 4 });
        close(timeline.widthFactorFor(logicalIndex), 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 1.22 / 3.8)));
        const outgoing = timeline.widthFactorFor(logicalIndex);
        const incoming = (logicalIndex + 1) % 4;
        timeline.sample({ ...frame, index: incoming });
        assert.equal(timeline.widthFactorFor(incoming), 1);
        assert.ok(timeline.progressFor(incoming) > 0 && timeline.progressFor(incoming) < 1);
        assert.equal(timeline.widthFactorFor(logicalIndex), outgoing);
        timeline.sample({ ...frame, index: logicalIndex, delta: 0 });
        assert.equal(timeline.widthFactorFor(logicalIndex), 1);
        assert.equal(timeline.progressFor(logicalIndex), 0);
    }
});

test('reduced motion and Save Data remain at full static width without replay when disabled', () => {
    for (const preference of ['reduced motion', 'Save Data']) {
        const timeline = createMenuTitleStretch();
        advance(timeline, 1.8);
        assert.ok(timeline.widthFactorFor(0) < 1, preference);
        advance(timeline, 3.8, { skip: true });
        assert.equal(timeline.progressFor(0), 1, preference);
        assert.equal(timeline.widthFactorFor(0), 1, preference);
        timeline.sample({ ...frame, delta: 0 });
        assert.equal(timeline.progressFor(0), 1, preference);
        assert.equal(timeline.widthFactorFor(0), 1, preference);
        timeline.sample(frame);
        assert.equal(timeline.progressFor(0), 1, preference);
        close(timeline.widthFactorFor(0), 1 - 0.025 * (1 - Math.cos(2 * Math.PI * 0.02 / 3.8)));
    }
    const timeline = createMenuTitleStretch();
    timeline.sample({ ...frame, skip: true });
    timeline.sample({ ...frame, delta: 0 });
    assert.equal(timeline.progressFor(0), 1);
    assert.equal(timeline.widthFactorFor(0), 1);
});

test('desktop keeps native title width and freezes rather than clears the mobile breath snapshot', () => {
    const timeline = createMenuTitleStretch();
    advance(timeline, 2.2);
    const held = timeline.widthFactorFor(0);
    advance(timeline, 3.8, { mobile: false });
    assert.equal(timeline.progressFor(0), 0);
    assert.equal(timeline.widthFactorFor(0), 1);
    timeline.sample({ ...frame, delta: 0 });
    assert.equal(timeline.progressFor(0), 1);
    assert.equal(timeline.widthFactorFor(0), held);
});

test('breathing retains calibrated total width and centered nonlinear shapes for narrow and wide words', () => {
    for (const nativeWidth of [1.2, 3.8, 7]) {
        const center = 0.75;
        const left = center - nativeWidth / 2;
        const right = center + nativeWidth / 2;
        const bounds = new Float32Array([left, 0, left + nativeWidth * 0.2, 1,
            left + nativeWidth * 0.3, 0, left + nativeWidth * 0.6, 1,
            left + nativeWidth * 0.7, 0, right, 1]);
        const metrics = measureTitleGlyphs(bounds, [left, 0, right, 1]);
        const source = bounds.slice();
        const target = bounds.slice();
        const requestedWidth = 5;
        const baseWidth = Math.max(nativeWidth, requestedWidth);
        for (const widthFactor of [1, 0.975, 0.95, 0.975, 1, 0.95, 1]) {
            const strength = titleStretchStrength(metrics, requestedWidth, 1, widthFactor);
            applyTitleGlyphStretch(target, metrics, strength);
            close(target[target.length - 2] - target[0], baseWidth * widthFactor, 1e-6);
            close((target[0] + target[target.length - 2]) / 2, center, 1e-6);
            for (let offset = 0; offset < target.length; offset += 4) {
                assert.ok(target[offset + 2] > target[offset]);
                assert.equal(target[offset + 1], source[offset + 1]);
                assert.equal(target[offset + 3], source[offset + 3]);
                if (offset + 4 < target.length) {
                    assert.ok(target[offset + 4] > target[offset + 2]);
                }
            }
            assert.deepEqual(metrics.source, source);
            assert.deepEqual(bounds, source);
        }
        assert.equal(titleStretchStrength(metrics, requestedWidth, 1),
            titleStretchStrength(metrics, requestedWidth, 1, 1));
        assert.equal(titleStretchStrength(metrics, requestedWidth, 1, NaN),
            titleStretchStrength(metrics, requestedWidth, 1, 1));
        assert.equal(titleStretchStrength(metrics, requestedWidth, 1, Infinity),
            titleStretchStrength(metrics, requestedWidth, 1, 1));
    }
});

test('MenuTitle applies the shared width factor directly from immutable source glyph bounds', () => {
    const component = readFileSync(new URL('../components/pages/MenuTitle.jsx', import.meta.url), 'utf8');
    assert.match(component, /titleStretchStrength\(metrics, targetWidth, current\.progressFor\(logicalIndex\),\s*current\.widthFactorFor\(logicalIndex\)\)/);
    assert.match(component, /applyTitleGlyphStretch\(attribute\.array, metrics, strength\)/);
    assert.doesNotMatch(component, /useState|requestAnimationFrame/);
});
