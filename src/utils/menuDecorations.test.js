import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createMenuDecorationClock, createMenuDecorationLayout, createMenuDecorationVisibility,
    menuDecorationFoot, menuDecorationGroundY, menuDecorationMotion,
    menuDecorationPoint, projectMenuDecoration,
} from './menuDecorations.js';

const frame = { delta: 0.02, active: true, phase: 'menu', index: 4, selectedIndex: 4,
    ready: true, settled: true, visible: true, skip: false, travel: 0, direction: 1 };
const close = (actual, expected, tolerance = 1e-11) => assert.ok(Math.abs(actual - expected) < tolerance,
    `${actual} is not within ${tolerance} of ${expected}`);
const optionsFor = (width) => ({ width, height: width > 768 ? 900 : 740 });
const revealBackFor = (width) => (width <= 768 ? 11 : 9.5) * 0.32;

const bounds = { music: [-167 / 384, 168 / 384, -119 / 384, 113 / 384],
    mixes: [-163 / 384, 165 / 384, -127 / 384, 130 / 384] };
function spriteBounds(prop, sectionKey, options) {
    const [left, right, bottom, top] = bounds[sectionKey];
    const sine = Math.sin(prop.rotation[2]);
    const cosine = Math.cos(prop.rotation[2]);
    const yawSin = Math.sin(prop.rotation[1]);
    const yawCos = Math.cos(prop.rotation[1]);
    const points = [];
    for (const x of [left, right]) for (const y of [bottom, top]) {
        const rolledX = (x * cosine - y * sine) * prop.scale;
        const rolledY = (x * sine + y * cosine) * prop.scale;
        points.push(projectMenuDecoration([prop.position[0] + rolledX * yawCos,
            prop.position[1] + rolledY, prop.position[2] - rolledX * yawSin], options));
    }
    return { left: Math.min(...points.map((p) => p.screenX)), right: Math.max(...points.map((p) => p.screenX)),
        top: Math.min(...points.map((p) => p.screenY)), bottom: Math.max(...points.map((p) => p.screenY)) };
}

test('scatter is seeded and sparse, with material-specific stable load variations', () => {
    const music = createMenuDecorationLayout({ sectionKey: 'music', seed: 10 });
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'music', seed: 10 }), music);
    assert.notDeepEqual(createMenuDecorationLayout({ sectionKey: 'music', seed: 11 }), music);
    assert.notDeepEqual(createMenuDecorationLayout({ sectionKey: 'mixes', seed: 10 }), music);
    for (const sectionKey of ['music', 'mixes']) {
        assert.equal(createMenuDecorationLayout({ sectionKey }).length, 5);
        assert.equal(createMenuDecorationLayout({ sectionKey, width: 1440, height: 900 }).length, 7);
    }
    assert.equal(createMenuDecorationLayout({ sectionKey: 'code' }).length, 3);
    assert.equal(createMenuDecorationLayout({ sectionKey: 'code', width: 1440, height: 900 }).length, 4);
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'about' }), []);
});

test('rocks and cassettes have coplanar visible feet despite sprite padding and roll', () => {
    for (const sectionKey of ['music', 'mixes']) for (const width of [320, 390, 1440]) {
        for (let seed = 0; seed < 100; seed++) {
            const layout = createMenuDecorationLayout({ sectionKey, ...optionsFor(width), seed });
            assert.ok(layout.some((prop) => prop.position[2] < 0), 'at least one far prop');
            assert.ok(layout.some((prop) => prop.position[2] > 0), 'positive local Z is foreground');
            for (const prop of layout) {
                assert.equal(prop.grounded, true);
                assert.equal(prop.rotation[0], 0);
                const foot = menuDecorationFoot(sectionKey, prop.rotation[2]);
                close(prop.position[1] + foot.y * prop.scale, menuDecorationGroundY(sectionKey));
                close(prop.shadow.position[1], prop.groundY + 0.006);
                assert.ok(Math.abs(prop.rotation[2]) <= 0.08);
                assert.ok(prop.scale > 0);
                assert.equal(prop.motion, undefined, 'floor props have no idle animation');
            }
        }
    }
    close(menuDecorationGroundY('music', { itemSize: 5 }), -339 / 720 * 5);
    close(menuDecorationGroundY('mixes', { itemSize: 5 }), -329 / 720 * 5);
});

test('initial visible ground props protect title, hero, caption center and controls at 320+', () => {
    for (const width of [320, 390, 768, 1440]) for (const sectionKey of ['music', 'mixes']) {
        const options = optionsFor(width);
        for (let seed = 0; seed < 200; seed++) {
            const layout = createMenuDecorationLayout({ sectionKey, ...options, seed });
            for (const prop of layout.filter((item) => !item.foreground)) {
                const box = spriteBounds(prop, sectionKey, options);
                assert.ok(box.left > 0 && box.right < 1, 'entire visible cutout stays in canvas');
                assert.ok(box.top > 0.38 && box.bottom < 0.82, 'not in title or controls');
                assert.ok(box.right < (width <= 768 ? 0.15 : 0.25)
                    || box.left > (width <= 768 ? 0.85 : 0.75), 'side lane protects hero and caption');
                assert.ok(prop.sizePx >= (width <= 768 ? 24 : 46));
                assert.ok(prop.sizePx <= (width <= 768 ? 33 : 70));
            }
            if (width <= 768 && sectionKey === 'mixes') {
                assert.ok(layout[2].screenX < 0.06);
                assert.ok(layout[2].sizePx <= 27, 'caption-side cassette is smaller');
            }
        }
    }
});

test('extra foreground pieces are below fold and naturally reveal after physical back-dolly', () => {
    for (const width of [320, 390, 1440]) for (const sectionKey of ['music', 'mixes']) {
        const options = optionsFor(width);
        for (let seed = 0; seed < 100; seed++) {
            const layout = createMenuDecorationLayout({ sectionKey, ...options, seed });
            const extra = layout.filter((prop) => prop.foreground);
            assert.equal(extra.length, 2);
            for (const prop of extra) {
                const initial = spriteBounds(prop, sectionKey, options);
                assert.ok(initial.top > 1, 'opaque cutout begins below the viewport');
                const revealed = spriteBounds(prop, sectionKey, { ...options, cameraBack: revealBackFor(width) });
                assert.ok(revealed.top > 0.7 && revealed.bottom < 0.86, 'reveals in lower safe side area');
                assert.ok(revealed.left > 0 && revealed.right < 1);
                assert.ok(revealed.right < 0.15 || revealed.left > 0.85, 'foreground preserves caption center');
            }
        }
    }
});

test('world positions project correctly at far and positive foreground depths with tuned pitch', () => {
    const hub = { camDistMobile: 13, camDistDesktop: 8, camY: 3, itemY: 2.1, lookY: 2.7, fov: 54 };
    for (const width of [320, 1440]) for (const depth of [-2.05, -0.7, 0, 2.5, 100]) {
        const options = { width, height: 844, hub };
        const point = menuDecorationPoint({ screenX: 0.09, screenY: 0.6, depth, ...options });
        const projected = projectMenuDecoration(point.position, options);
        close(projected.screenX, 0.09);
        close(projected.screenY, 0.6);
        assert.ok(point.unitsPerPixel > 0);
        assert.ok(projected.depth > 0);
        assert.ok(point.position[2] <= (width <= 768 ? 13 : 8) - 0.25);
    }
});

test('floating Code braces keep text-safe lanes and gentle asynchronous motion', () => {
    for (const width of [320, 390, 1440]) for (let seed = 0; seed < 100; seed++) {
        const layout = createMenuDecorationLayout({ sectionKey: 'code', ...optionsFor(width), seed });
        const phases = new Set();
        for (const prop of layout) {
            assert.equal(prop.grounded, false);
            assert.equal(prop.shadow, undefined);
            assert.ok(prop.screenY > 0.43 && prop.screenY < 0.63);
            assert.ok(prop.screenX < 0.2 || prop.screenX > 0.8);
            assert.ok(prop.motion.period >= 4.4 && prop.motion.period <= 6.9);
            phases.add(prop.motion.phase);
            const output = { y: 0, yaw: 0, roll: 0 };
            for (const time of [0, 0.2, 2, 5, 11, 100]) {
                assert.equal(menuDecorationMotion(prop, time, output), output, 'reuses frame storage');
                assert.ok(Math.abs(output.y) <= 0.035);
                assert.ok(Math.abs(output.yaw) <= 0.035);
                assert.ok(Math.abs(output.roll) <= 0.026);
            }
            assert.deepEqual(menuDecorationMotion(prop, 11, output, false), { y: 0, yaw: 0, roll: 0 });
        }
        assert.equal(phases.size, layout.length);
    }
    const ground = createMenuDecorationLayout({ sectionKey: 'music' })[0];
    assert.deepEqual(menuDecorationMotion(ground, 100, {}), { y: 0, yaw: 0, roll: 0 });
});

test('decor clock freezes hidden/nonrendered/preferences time and bounds resumed deltas', () => {
    const clock = createMenuDecorationClock();
    const moving = { ...frame, rendered: true };
    close(clock.sample(moving), 0.02);
    for (const changes of [{ visible: false }, { rendered: false }, { skip: true }]) {
        for (let i = 0; i < 50; i++) close(clock.sample({ ...moving, ...changes }), 0.02);
    }
    for (const delta of [NaN, -1, Infinity]) close(clock.sample({ ...moving, delta }), 0.02);
    close(clock.sample({ ...moving, delta: 30 }), 0.07);
});

test('menu entrance waits for reveal/settled camera and freezes hidden time', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, ready: false }), 0);
    assert.equal(visibility.sample({ ...frame, settled: false }), 0);
    for (let i = 0; i < 10; i++) close(visibility.sample(frame), 0);
    visibility.sample(frame);
    assert.ok(visibility.opacity > 0 && visibility.opacity < 1);
    const opacity = visibility.opacity;
    for (let i = 0; i < 50; i++) assert.equal(visibility.sample({ ...frame, visible: false }), opacity);
    for (let i = 0; i < 14; i++) visibility.sample(frame);
    assert.equal(visibility.opacity, 1);
});

test('travel retains props through .30, fades by .52 and returns without entrance replay', () => {
    const visibility = createMenuDecorationVisibility();
    visibility.sample({ ...frame, skip: true });
    const travelling = { ...frame, phase: 'travel', settled: false };
    for (const travel of [0, 0.1, 0.2, 0.3]) close(visibility.sample({ ...travelling, travel }), 1);
    let previous = 1;
    for (const travel of [0.32, 0.35, 0.4, 0.48, 0.52, 0.6]) {
        const opacity = visibility.sample({ ...travelling, travel });
        assert.ok(opacity <= previous);
        previous = opacity;
    }
    assert.equal(previous, 0);
    assert.equal(visibility.sample({ ...frame, phase: 'section' }), 0);
    for (const travel of [0.52, 0.4, 0.3, 0]) {
        const opacity = visibility.sample({ ...travelling, travel, direction: -1 });
        assert.ok(opacity >= previous);
        previous = opacity;
    }
    assert.equal(visibility.sample(frame), 1);
});

test('quick scroll entry reveals even before delayed menu entrance, with safe cancellation', () => {
    const visibility = createMenuDecorationVisibility();
    visibility.sample({ ...frame, settled: false });
    const travelling = { ...frame, phase: 'travel', settled: false };
    assert.ok(visibility.sample({ ...travelling, travel: 0.05 }) > 0);
    close(visibility.sample({ ...travelling, travel: 0.14 }), 1);
    close(visibility.sample({ ...travelling, travel: 0.3 }), 1);
    close(visibility.sample({ ...travelling, travel: 0.52 }), 0);
    const interrupted = createMenuDecorationVisibility();
    const current = interrupted.sample({ ...travelling, travel: 0.07 });
    close(interrupted.sample({ ...travelling, travel: 0.07, direction: -1 }), current);
    close(interrupted.sample({ ...travelling, travel: 0, direction: -1 }), current);
    assert.ok(interrupted.sample(frame) > current, 'menu completes interrupted entrance');
    const oneFrameReturn = createMenuDecorationVisibility();
    const partial = oneFrameReturn.sample({ ...travelling, travel: 0.05 });
    assert.ok(oneFrameReturn.sample(frame) >= partial, 'direct travel→menu cannot drop to zero');
});

test('section/foreign/wrong physical copy/interruption hides and safely recovers', () => {
    const visibility = createMenuDecorationVisibility();
    for (const changed of [{ phase: 'section' }, { phase: 'foreign' }, { selectedIndex: 0 },
        { selectedIndex: 8 }, { active: false }, { ready: false }]) {
        assert.equal(visibility.sample({ ...frame, skip: true }), 1);
        assert.equal(visibility.sample({ ...frame, ...changed }), 0);
        assert.equal(visibility.sample(frame), 0);
    }
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
});

test('reduced-motion/Save Data is immediate static decor; invalid layout inputs remain finite', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
    visibility.sample({ ...frame, phase: 'section' });
    for (const delta of [NaN, -1, Infinity, 30]) assert.equal(visibility.sample({ ...frame, delta }), 0);
    assert.ok(visibility.elapsed <= 0.05);
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'missing' }), []);
    for (const sectionKey of ['music', 'mixes', 'code']) {
        const layout = createMenuDecorationLayout({ sectionKey, width: NaN, height: NaN,
            seed: Infinity, hub: { fov: NaN, camY: NaN } });
        for (const prop of layout) assert.ok([...prop.position, prop.scale, ...prop.rotation].every(Number.isFinite));
    }
});
