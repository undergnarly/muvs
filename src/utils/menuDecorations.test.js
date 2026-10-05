import test from 'node:test';
import assert from 'node:assert/strict';
import { BoxGeometry, CylinderGeometry, Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import {
    createMenuDecorationClock, createMenuDecorationLayout, createMenuDecorationTextureCache, createMenuDecorationTimeline, createMenuDecorationVisibility,
    getMenuDecorationTextureCache, prepareMenuDecorationAssets,
    menuDecorationFoot, menuDecorationGroundY, menuDecorationModelDimensions, menuDecorationModelSupport, menuDecorationMotion,
    menuDecorationPoint, projectMenuDecoration,
} from './menuDecorations.js';
import { MENU_DECORATION_ASSETS } from '../data/menuDecorAssets.js';

const frame = { delta: 0.02, active: true, phase: 'menu', index: 4, selectedIndex: 4,
    ready: true, settled: true, visible: true, skip: false, travel: 0, direction: 1 };
const close = (actual, expected, tolerance = 1e-11) => assert.ok(Math.abs(actual - expected) < tolerance,
    `${actual} is not within ${tolerance} of ${expected}`);
const optionsFor = (width) => ({ width, height: width > 768 ? 900 : width <= 320 ? 640 : 728 });
const revealBackFor = (width) => (width <= 768 ? 11 : 9.5) * 0.32;

const createGroundLayout = createMenuDecorationLayout;

const bounds = { music: [-167 / 384, 168 / 384, -119 / 384, 113 / 384],
    mixes: [-163 / 384, 165 / 384, -127 / 384, 130 / 384] };
function spriteBounds(prop, sectionKey, options) {
    if (prop.model) {
        const dimensions = menuDecorationModelDimensions(prop.model);
        const geometry = prop.model.kind === 'cassette' ? new BoxGeometry(...dimensions)
            : new CylinderGeometry(0.5, 0.5, dimensions[1], 64);
        const orientation = new Quaternion().setFromEuler(new Euler(...prop.rotation));
        const attribute = geometry.getAttribute('position');
        const points = [];
        for (let i = 0; i < attribute.count; i++) {
            const point = new Vector3().fromBufferAttribute(attribute, i).multiplyScalar(prop.scale)
                .applyQuaternion(orientation).add(new Vector3(...prop.position));
            points.push(projectMenuDecoration(point.toArray(), options));
        }
        geometry.dispose();
        return { left: Math.min(...points.map((p) => p.screenX)), right: Math.max(...points.map((p) => p.screenX)),
            top: Math.min(...points.map((p) => p.screenY)), bottom: Math.max(...points.map((p) => p.screenY)) };
    }
    const longestSide = Math.max(prop.asset.width, prop.asset.height);
    const [left, right, bottom, top] = prop.asset.opaqueBounds
        ? prop.asset.opaqueBounds.map((value) => value / longestSide) : bounds[sectionKey];
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

test('curated floor composition stays fixed across reloads and physical copies', () => {
    const music = createGroundLayout({ sectionKey: 'music', seed: 10 });
    assert.deepEqual(createGroundLayout({ sectionKey: 'music', seed: 10 }), music);
    assert.deepEqual(createGroundLayout({ sectionKey: 'music', seed: 11 }), music);
    assert.notDeepEqual(createGroundLayout({ sectionKey: 'mixes', seed: 10 }), music);
    for (const sectionKey of ['music', 'mixes']) {
        assert.equal(createGroundLayout({ sectionKey }).length, sectionKey === 'music' ? 5 : 6);
        assert.equal(createGroundLayout({ sectionKey, width: 1440, height: 900 }).length, sectionKey === 'music' ? 5 : 7);
    }
    assert.equal(createMenuDecorationLayout({ sectionKey: 'code' }).length, 3);
    assert.equal(createMenuDecorationLayout({ sectionKey: 'code', width: 1440, height: 900 }).length, 4);
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'code', seed: 10 }),
        createMenuDecorationLayout({ sectionKey: 'code', seed: 11 }));
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'about' }), []);
});

test('rocks and volumetric analog props have grounded supports in every fixed pose', () => {
    for (const sectionKey of ['music', 'mixes']) for (const width of [320, 390, 1440]) {
        for (let seed = 0; seed < 1; seed++) {
            const layout = createGroundLayout({ sectionKey, ...optionsFor(width), seed });
            assert.ok(layout.some((prop) => prop.position[2] < 0), 'at least one far prop');
            assert.ok(layout.some((prop) => prop.position[2] > 0), 'positive local Z is foreground');
            for (const prop of layout) {
                assert.equal(prop.grounded, true);
                const foot = prop.model ? menuDecorationModelSupport(prop.model, prop.rotation)
                    : menuDecorationFoot(sectionKey, prop.rotation[2], prop.asset);
                close(prop.position[1] + foot.y * prop.scale, menuDecorationGroundY(sectionKey) + (prop.model ? 0.002 : 0));
                close(prop.shadow.position[1], prop.groundY + 0.006);
                assert.ok(prop.model || Math.abs(prop.rotation[2]) <= 0.08);
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
        for (let seed = 0; seed < 1; seed++) {
            const layout = createGroundLayout({ sectionKey, ...options, seed });
            for (const prop of layout.filter((item) => !item.foreground)) {
                const box = spriteBounds(prop, sectionKey, options);
                assert.ok(box.left > 0 && box.right < 1, 'entire visible cutout stays in canvas');
                assert.ok(box.top > 0.38 && box.bottom < 0.90, 'not in title or controls');
                const sideLimit = prop.belowCaption ? 0.30 : width <= 768 ? 0.15 : 0.25;
                assert.ok(box.right < sideLimit || box.left > 1 - sideLimit, 'side lane protects hero and caption');
                assert.equal(prop.sizePx, undefined, 'ground props have physical rather than pixel sizes');
            }
            const belowCaption = layout.filter((prop) => prop.belowCaption);
            assert.equal(belowCaption.length, sectionKey === 'music' ? 1 : 2);
            for (const prop of belowCaption) {
                const box = spriteBounds(prop, sectionKey, options);
                assert.ok(box.top >= 0.77 && box.bottom < 0.90, 'near details sit below copy at rest');
            }
            if (width <= 768 && sectionKey === 'mixes') {
                const cassette = belowCaption.find((prop) => prop.model.kind === 'cassette');
                assert.ok(cassette.screenX > 0.94);
            }
        }
    }
});

test('extra foreground pieces are below fold and naturally reveal after physical back-dolly', () => {
    for (const width of [320, 390, 1440]) for (const sectionKey of ['music', 'mixes']) {
        const options = optionsFor(width);
        for (let seed = 0; seed < 1; seed++) {
            const layout = createGroundLayout({ sectionKey, ...options, seed });
            const extra = layout.filter((prop) => prop.foreground);
            assert.equal(extra.length, 2);
            for (const prop of extra) {
                const initial = spriteBounds(prop, sectionKey, options);
                assert.ok(initial.top > 1, 'opaque cutout begins below the viewport');
                const revealed = spriteBounds(prop, sectionKey, { ...options, cameraBack: revealBackFor(width) });
                assert.ok(revealed.top > 0.66 && revealed.bottom < 0.90, 'reveals in lower safe side area');
                assert.ok(revealed.left > 0 && revealed.right < 1);
                assert.ok(revealed.right < 0.36 || revealed.left > 0.64, 'foreground preserves content center');
            }
        }
    }
});

test('records lie flat on the floor while cassette poses remain varied', () => {
    for (const width of [320, 390, 1440]) {
        const props = createGroundLayout({ sectionKey: 'mixes', ...optionsFor(width) });
        const cassettePoses = new Set(props.filter((prop) => prop.model.kind === 'cassette').map((prop) => prop.model.pose));
        assert.deepEqual(cassettePoses, new Set(['flat', 'standing']));
        for (const prop of props.filter((item) => item.model.kind === 'vinyl')) {
            assert.equal(prop.model.pose, 'flat', 'unsupported upright records should not balance on an edge');
            close(prop.rotation[0], 0);
            close(prop.rotation[2], 0);
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

test('menu props appear immediately with the revealed hero even while camera is settling', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, ready: false }), 0);
    assert.equal(visibility.sample({ ...frame, settled: false, delta: 0 }), 1);
    for (let i = 0; i < 50; i++) assert.equal(visibility.sample({ ...frame, visible: false }), 1);
    visibility.reset();
    assert.equal(visibility.sample({ ...frame, visible: false }), 0);
    assert.equal(visibility.sample({ ...frame, settled: false }), 1);
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

test('quick scroll entry and cancellation never replay an independent entrance delay', () => {
    const visibility = createMenuDecorationVisibility();
    close(visibility.sample({ ...frame, settled: false }), 1);
    const travelling = { ...frame, phase: 'travel', settled: false };
    close(visibility.sample({ ...travelling, travel: 0.05 }), 1);
    close(visibility.sample({ ...travelling, travel: 0.14 }), 1);
    close(visibility.sample({ ...travelling, travel: 0.3 }), 1);
    close(visibility.sample({ ...travelling, travel: 0.52 }), 0);
    const interrupted = createMenuDecorationVisibility();
    const current = interrupted.sample({ ...travelling, travel: 0.07 });
    close(interrupted.sample({ ...travelling, travel: 0.07, direction: -1 }), current);
    close(interrupted.sample({ ...travelling, travel: 0, direction: -1 }), current);
    close(interrupted.sample(frame), current);
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
        assert.equal(visibility.sample(frame), 1);
    }
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
});

test('reduced-motion/Save Data is immediate static decor; invalid layout inputs remain finite', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
    visibility.sample({ ...frame, phase: 'section' });
    for (const delta of [NaN, -1, Infinity, 30]) assert.equal(visibility.sample({ ...frame, delta }), 1);
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'missing' }), []);
    for (const sectionKey of ['music', 'mixes', 'code']) {
        const layout = createMenuDecorationLayout({ sectionKey, width: NaN, height: NaN,
            seed: Infinity, hub: { fov: NaN, camY: NaN } });
        for (const prop of layout) assert.ok([...prop.position, prop.scale, ...prop.rotation].every(Number.isFinite));
    }
});

test('parent-owned timeline preserves full opacity across 3→7 and 8→4 physical wraps', () => {
    for (const [from, to] of [[3, 7], [8, 4]]) {
        const timeline = createMenuDecorationTimeline();
        timeline.select(from % 4);
        close(timeline.sample({ ...frame, index: from, selectedIndex: from, skip: true }), 1);
        timeline.select(to % 4);
        for (const index of [to - 4, to + 4]) {
            close(timeline.sample({ ...frame, index, selectedIndex: to }), 0);
            assert.equal(timeline.visibility.opacity, 1, 'wrong copy must not reset shared opacity');
        }
        close(timeline.sample({ ...frame, index: to, selectedIndex: to }), 1);
        close(timeline.sample({ ...frame, index: from, selectedIndex: to }), 0);
        close(timeline.visibility.opacity, 1);
    }
});

test('physical handoff retains immediate visibility independent of child callback order', () => {
    const timeline = createMenuDecorationTimeline();
    timeline.select(3);
    const initial = { ...frame, index: 3, selectedIndex: 3 };
    for (let i = 0; i < 15; i++) timeline.sample(initial);
    const before = timeline.visibility.opacity;
    assert.equal(before, 1);
    timeline.select(3);
    close(timeline.sample({ ...initial, selectedIndex: 7 }), 0);
    const after = timeline.sample({ ...initial, index: 7, selectedIndex: 7 });
    close(after, before);
    close(timeline.sample({ ...initial, selectedIndex: 7 }), 0);
    close(timeline.visibility.opacity, after);
});

test('logical selection resets the Code motion clock but new props have no entrance delay', () => {
    const timeline = createMenuDecorationTimeline();
    timeline.select(0);
    timeline.sample({ ...frame, skip: true });
    timeline.sampleMotion({ ...frame, rendered: true });
    timeline.select(0);
    close(timeline.visibility.opacity, 1);
    close(timeline.motionClock.elapsed, frame.delta);
    timeline.select(1);
    close(timeline.visibility.opacity, 0);
    close(timeline.motionClock.elapsed, 0);
    timeline.select(0);
    close(timeline.sample({ ...frame, settled: false }), 1);
});

test('Code motion clock transfers physical copies and only the selected copy advances', () => {
    const timeline = createMenuDecorationTimeline();
    timeline.select(2);
    const current = { ...frame, index: 2, selectedIndex: 2, rendered: true };
    close(timeline.sampleMotion(current), 0.02);
    timeline.select(2);
    const wrapped = { ...current, selectedIndex: 6 };
    close(timeline.sampleMotion(wrapped), 0.02);
    close(timeline.sampleMotion({ ...wrapped, index: 6 }), 0.04);
    close(timeline.sampleMotion({ ...wrapped, index: 10 }), 0.04);
    close(timeline.sampleMotion({ ...wrapped, index: 6, visible: false }), 0.04);
    close(timeline.sampleMotion({ ...wrapped, index: 6, skip: true }), 0.04);
});

test('shared timeline still gates phase/reveal/preferences and reverse travel after handoff', () => {
    const timeline = createMenuDecorationTimeline();
    timeline.select(0);
    timeline.sample({ ...frame, skip: true });
    close(timeline.sample({ ...frame, index: 8, selectedIndex: 8, phase: 'travel', travel: 0.3 }), 1);
    close(timeline.sample({ ...frame, index: 8, selectedIndex: 8, phase: 'travel', travel: 0.52 }), 0);
    close(timeline.sample({ ...frame, index: 8, selectedIndex: 8, phase: 'section' }), 0);
    close(timeline.sample({ ...frame, index: 4, selectedIndex: 4, phase: 'travel', direction: -1, travel: 0.2 }), 1);
    close(timeline.sample({ ...frame, ready: false }), 0);
    close(timeline.sample({ ...frame, skip: true }), 1);
    close(timeline.sample({ ...frame, visible: false }), 1);
});

test('fixed floor assignments never repeat and Mixes always includes cassette and visible vinyl', () => {
    for (const sectionKey of ['music', 'mixes']) for (const width of [320, 390, 1440]) {
        const orders = new Set();
        for (let seed = 0; seed < 100; seed++) {
            const layout = createGroundLayout({ sectionKey, ...optionsFor(width), seed });
            const count = sectionKey === 'music' ? 5 : width <= 768 ? 6 : 7;
            assert.equal(layout.length, count);
            assert.equal(layout.filter((prop) => !prop.foreground).length, count - 2);
            assert.equal(layout.filter((prop) => prop.foreground).length, 2);
            const identifiers = layout.map((prop) => prop.model ? `${prop.model.kind}-${prop.model.variant}` : prop.asset.src);
            assert.equal(new Set(identifiers).size, count);
            if (sectionKey === 'mixes') {
                const initial = layout.filter((prop) => !prop.foreground);
                assert.ok(initial.some((prop) => prop.model.kind === 'cassette'));
                assert.ok(initial.some((prop) => prop.model.kind === 'vinyl'));
            }
            for (const prop of layout) {
                assert.ok(prop.scale > 0, 'no mirrored cassette branding');
                assert.ok(prop.model || Math.abs(prop.rotation[1]) <= 0.14);
                assert.ok(prop.model || Math.abs(prop.rotation[2]) <= 0.08);
            }
            orders.add(identifiers.join('|'));
        }
        assert.equal(orders.size, 1, 'asset assignments do not vary with session seed');
    }
});

test('unmeasured or duplicate variants do not invent floor contacts or repeat the last sprite', () => {
    const original = MENU_DECORATION_ASSETS.music.at(-1);
    const layout = createMenuDecorationLayout({ sectionKey: 'music', variants: [
        original, original, { src: '/unmeasured.webp', width: 384, height: 384 },
    ] });
    assert.equal(layout.length, 1);
    assert.equal(layout[0].asset.src, original.src);
    assert.ok(layout.every((prop) => Number.isFinite(prop.position[1])));
});

test('non-square variant aspect and its actual alpha foot share the same normalization', () => {
    const original = MENU_DECORATION_ASSETS.music[0];
    const variant = { ...original, src: '/fixture-nonsquare.webp', height: 300 };
    const [prop] = createMenuDecorationLayout({ sectionKey: 'music', variants: [variant], seed: 4 });
    assert.deepEqual(prop.planeSize, [1, 300 / 384]);
    const foot = menuDecorationFoot('music', prop.rotation[2], variant);
    close(prop.position[1] + foot.y * prop.scale, prop.groundY);
});

test('optional per-variant cache shares requests and isolates failure without subscriptions', async () => {
    const calls = [];
    const loaded = { image: { width: 384, height: 384 } };
    const cache = createMenuDecorationTextureCache((src) => {
        calls.push(src);
        return src === '/failed.webp' ? Promise.reject(new Error('missing')) : Promise.resolve(loaded);
    });
    const ready = cache.get('/ready.webp');
    const failed = cache.get('/failed.webp');
    assert.equal(cache.get('/ready.webp'), ready);
    assert.equal(cache.get('/failed.webp'), failed);
    assert.equal(ready.texture, null);
    const request = cache.start(ready);
    assert.equal(cache.start(ready), request);
    await Promise.all([request, cache.start(failed)]);
    assert.equal(ready.texture, loaded);
    assert.equal(ready.failed, false);
    assert.equal(failed.texture, null);
    assert.equal(failed.failed, true);
    await Promise.all([cache.start(ready), cache.start(failed)]);
    assert.deepEqual(calls, ['/ready.webp', '/failed.webp']);
});

test('sprite requests settle within 3500ms and a timed-out result cannot pop in later', async () => {
    const timers = new Map();
    let id = 0;
    let complete;
    const loaded = { image: { width: 384, height: 384 } };
    const cache = createMenuDecorationTextureCache(() => new Promise((resolve) => { complete = resolve; }), {
        timeoutMs: Infinity,
        setTimer(callback, delay) {
            assert.equal(delay, 3500);
            timers.set(++id, callback);
            return id;
        },
        clearTimer(timer) { timers.delete(timer); },
    });
    const record = cache.get('/hung.webp');
    const request = cache.start(record);
    await Promise.resolve();
    assert.equal(timers.size, 1);
    timers.values().next().value();
    assert.equal(await request, null);
    assert.equal(record.failed, true);
    assert.equal(timers.size, 0);
    complete(loaded);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(record.texture, null);
    assert.equal(cache.start(record), request);
});

test('shared startup preparation warms only six unique Music and Code sprites exactly once', async () => {
    const calls = [];
    const loaded = { image: { width: 384, height: 384 } };
    const loadTexture = (src) => { calls.push(src); return Promise.resolve(loaded); };
    const cache = getMenuDecorationTextureCache(loadTexture);
    assert.equal(getMenuDecorationTextureCache(loadTexture), cache);
    assert.equal(calls.length, 0, 'import and cache lookup never start image loading');
    const first = prepareMenuDecorationAssets(loadTexture);
    assert.equal(prepareMenuDecorationAssets(loadTexture), first);
    const textures = await first;
    assert.equal(textures.length, 6);
    const sources = [...MENU_DECORATION_ASSETS.music, ...MENU_DECORATION_ASSETS.code].map((asset) => asset.src);
    assert.deepEqual(calls, sources);
    for (const source of sources) assert.equal(cache.get(source).texture, loaded);
    assert.ok(!calls.some((source) => /cassette|vinyl|reel/.test(source)), 'procedural Mixes models have no sprite request');
    await prepareMenuDecorationAssets(loadTexture);
    assert.deepEqual(calls, sources);
});

test('all floor asset records carry measured dimensions, alpha feet and silhouette bounds', () => {
    for (const sectionKey of ['music', 'mixes']) {
        const assets = MENU_DECORATION_ASSETS[sectionKey];
        assert.equal(assets.length, sectionKey === 'music' ? 5 : 8);
        assert.equal(new Set(assets.map((asset) => asset.src)).size, assets.length);
        for (const asset of assets) {
            assert.ok(asset.width > 0 && asset.height > 0);
            assert.ok(asset.footHull.length >= 2);
            assert.equal(asset.opaqueBounds.length, 4);
            const [left, right, bottom, top] = asset.opaqueBounds;
            assert.ok(left >= -asset.width / 2 && right <= asset.width / 2);
            assert.ok(bottom >= -asset.height / 2 && top <= asset.height / 2);
            for (const [x, y] of asset.footHull) {
                assert.ok(x >= left && x <= right && y >= bottom && y <= top);
            }
        }
    }
});

test('actual Three Euler transforms keep each alpha silhouette and contact shadow on the hero floor', () => {
    for (const width of [320, 390, 1440]) for (const sectionKey of ['music']) {
        const layout = createMenuDecorationLayout({ sectionKey, ...optionsFor(width) });
        for (const prop of layout) {
            const orientation = new Quaternion().setFromEuler(new Euler(...prop.rotation));
            const origin = new Vector3(...prop.position);
            const longestSide = Math.max(prop.asset.width, prop.asset.height);
            const points = prop.asset.footHull.map(([x, y]) => new Vector3(x / longestSide, y / longestSide, 0)
                .multiplyScalar(prop.scale).applyQuaternion(orientation).add(origin));
            const contact = points.reduce((lowest, point) => point.y < lowest.y ? point : lowest);
            close(contact.y, prop.groundY);
            assert.ok(points.every((point) => point.y >= prop.groundY - 1e-11), 'no opaque foot penetrates the floor');
            close(prop.shadow.position[0], contact.x);
            close(prop.shadow.position[1], contact.y + 0.006);
            close(prop.shadow.position[2], contact.z);
        }
    }
});

test('physical widths are fixed across viewport, aspect, DPR inputs and depth, scaling only with hero', () => {
    for (const sectionKey of ['music', 'mixes']) {
        const canonical = createMenuDecorationLayout({ sectionKey, width: 390, height: 728 });
        for (const [width, height] of [[320, 640], [390, 844], [390, 728], [1440, 900]]) {
            const layout = createMenuDecorationLayout({ sectionKey, width, height, dpr: 3, cameraBack: 10 });
            for (const prop of layout) {
                const matching = canonical.find((entry) => prop.model ? entry.model?.kind === prop.model.kind
                    : entry.asset.src === prop.asset.src);
                close(prop.scale, matching.scale);
            }
        }
        const doubled = createMenuDecorationLayout({ sectionKey, hub: { itemSize: 6.8 } });
        for (let i = 0; i < canonical.length; i++) close(doubled[i].scale, canonical[i].scale * 2);
    }
});

test('near equal-size cassette projects larger than far, while vinyl diameter is exactly three cassette widths', () => {
    const options = { width: 390, height: 728 };
    const props = createMenuDecorationLayout({ sectionKey: 'mixes', ...options });
    const far = props.find((prop) => prop.model?.kind === 'cassette' && prop.model.pose === 'flat' && !prop.belowCaption);
    const near = props.find((prop) => prop.model?.kind === 'cassette' && prop.belowCaption);
    const vinyl = props.find((prop) => prop.model?.kind === 'vinyl');
    assert.ok(far && near && vinyl);
    close(far.scale, near.scale);
    close(vinyl.scale, far.scale * 3);
    const farBox = spriteBounds(far, 'mixes', options);
    const nearBox = spriteBounds(near, 'mixes', options);
    assert.ok(nearBox.right - nearBox.left > (farBox.right - farBox.left) * 1.4);
    assert.ok(props.every((prop) => prop.model && !prop.planeSize && !prop.asset), 'analog is volume, not an alpha billboard');
    assert.deepEqual(menuDecorationModelDimensions('cassette'), [1, 0.64, 0.12]);
    assert.deepEqual(menuDecorationModelDimensions('vinyl'), [1, 0.012, 1]);
    assert.deepEqual(menuDecorationModelDimensions('reel'), [1, 0.07, 1]);
});

test('rotated Three box and cylinder vertices never penetrate the modeled floor support', () => {
    for (const width of [320, 390, 1440]) {
        for (const prop of createMenuDecorationLayout({ sectionKey: 'mixes', ...optionsFor(width) })) {
            const dimensions = menuDecorationModelDimensions(prop.model);
            const geometry = prop.model.kind === 'cassette' ? new BoxGeometry(...dimensions)
                : new CylinderGeometry(0.5, 0.5, dimensions[1], 256);
            const attribute = geometry.getAttribute('position');
            const orientation = new Quaternion().setFromEuler(new Euler(...prop.rotation));
            const support = menuDecorationModelSupport(prop.model, prop.rotation);
            close(prop.position[1] + support.y * prop.scale, prop.groundY + 0.002);
            let lowest = Infinity;
            for (let i = 0; i < attribute.count; i++) {
                const point = new Vector3().fromBufferAttribute(attribute, i).multiplyScalar(prop.scale)
                    .applyQuaternion(orientation).add(new Vector3(...prop.position));
                assert.ok(point.y >= prop.groundY + 0.002 - 1e-8);
                lowest = Math.min(lowest, point.y);
            }
            assert.ok(lowest < prop.groundY + 0.0021, 'no visible model hovering gap');
            close(prop.shadow.position[0], prop.position[0] + support.x * prop.scale);
            close(prop.shadow.position[2], prop.position[2] + support.z * prop.scale);
            geometry.dispose();
        }
    }
});

test('decoration projection agrees with the actual Three perspective camera at rest and during dolly', () => {
    const hub = { camDistMobile: 13, camDistDesktop: 8, camY: 3, itemY: 2.1, lookY: 2.7, fov: 54 };
    for (const width of [320, 390, 1440]) for (const cameraBack of [0, 2.4, 3.6]) {
        const options = { ...optionsFor(width), hub, cameraBack };
        const distance = (width <= 768 ? hub.camDistMobile : hub.camDistDesktop) + cameraBack;
        const camera = new PerspectiveCamera(hub.fov, options.width / options.height, 0.01, 1000);
        camera.position.set(0, hub.camY - hub.itemY, distance);
        camera.lookAt(0, hub.lookY - hub.itemY, 0);
        camera.updateMatrixWorld();
        for (const sectionKey of ['music', 'mixes']) {
            for (const prop of createMenuDecorationLayout({ sectionKey, ...options })) {
                const actual = new Vector3(...prop.position).project(camera);
                const expected = projectMenuDecoration(prop.position, options);
                close(expected.screenX, actual.x * 0.5 + 0.5);
                close(expected.screenY, 0.5 - actual.y * 0.5);
            }
        }
    }
});
