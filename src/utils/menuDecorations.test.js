import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuDecorationLayout, createMenuDecorationVisibility, menuDecorationPoint } from './menuDecorations.js';

const frame = { delta: 0.02, active: true, phase: 'menu', index: 4, selectedIndex: 4, ready: true, settled: true, visible: true, skip: false };

test('scatter is seeded, stable and has section/load variations without mirrored props', () => {
    const music = createMenuDecorationLayout({ sectionKey: 'music', seed: 10 });
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'music', seed: 10 }), music);
    assert.notDeepEqual(createMenuDecorationLayout({ sectionKey: 'music', seed: 11 }), music);
    assert.notDeepEqual(createMenuDecorationLayout({ sectionKey: 'mixes', seed: 10 }), music);
    assert.equal(music.length, 3);
    assert.equal(createMenuDecorationLayout({ sectionKey: 'code', width: 1440, height: 900 }).length, 4);
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'about' }), []);
    for (const item of music) {
        assert.ok(item.scale > 0);
        assert.ok(item.position[2] < 0);
        assert.ok(Math.abs(item.rotation[2]) <= 0.36);
    }
});

test('small-screen bounds protect title, caption, controls and canvas edges for many seeds', () => {
    for (const width of [320, 390, 768, 1440]) {
        const height = width === 1440 ? 900 : 740;
        for (let seed = 0; seed < 200; seed++) {
            const layout = createMenuDecorationLayout({ sectionKey: 'music', width, height, seed });
            for (const item of layout) {
                const boundPx = item.sizePx * (Math.abs(Math.cos(item.rotation[2])) + Math.abs(Math.sin(item.rotation[2]))) / 2;
                assert.ok(item.screenX - boundPx / width > 0);
                assert.ok(item.screenX + boundPx / width < 1);
                assert.ok(item.screenY - boundPx / height > 0.38);
                assert.ok(item.screenY + boundPx / height < 0.66);
                assert.ok(item.sizePx >= (width <= 768 ? 23 : 46));
                assert.ok(item.sizePx <= (width <= 768 ? 32 : 71));
            }
        }
    }
});

test('world-space placement projects to the same reference screen point at varied depths/hub settings', () => {
    const hub = { camDistMobile: 13, camDistDesktop: 8, camY: 3, itemY: 2.1, lookY: 2.7, fov: 54 };
    for (const width of [320, 1440]) for (const depth of [-0.7, -2.05]) {
        const height = 844;
        const point = menuDecorationPoint({ screenX: 0.09, screenY: 0.6, depth, width, height, hub });
        const distance = width <= 768 ? hub.camDistMobile : hub.camDistDesktop;
        const drop = hub.camY - hub.lookY;
        const length = Math.hypot(distance, drop);
        const dy = point.position[1] - (hub.camY - hub.itemY);
        const dz = point.position[2] - distance;
        const cameraDepth = -dy * drop / length - dz * distance / length;
        const cameraUp = dy * distance / length - dz * drop / length;
        const tangent = Math.tan(hub.fov * Math.PI / 360);
        const ndcX = point.position[0] / (cameraDepth * tangent * width / height);
        const ndcY = cameraUp / (cameraDepth * tangent);
        assert.ok(Math.abs((ndcX + 1) / 2 - 0.09) < 1e-12);
        assert.ok(Math.abs((1 - ndcY) / 2 - 0.6) < 1e-12);
        assert.ok(point.unitsPerPixel > 0);
    }
});

test('unknown and invalid layout inputs remain absent or finite', () => {
    assert.deepEqual(createMenuDecorationLayout({ sectionKey: 'missing' }), []);
    const layout = createMenuDecorationLayout({ sectionKey: 'code', width: NaN, height: NaN, seed: Infinity, hub: { fov: NaN, camY: NaN } });
    for (const item of layout) assert.ok([...item.position, item.scale, ...item.rotation].every(Number.isFinite));
});

test('decorations wait for reveal/settled camera then fade, no accumulated hidden time', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, ready: false }), 0);
    assert.equal(visibility.sample({ ...frame, settled: false }), 0);
    for (let i = 0; i < 10; i++) assert.equal(visibility.sample(frame), 0);
    visibility.sample(frame);
    assert.ok(visibility.opacity > 0 && visibility.opacity < 1);
    const opacity = visibility.opacity;
    for (let i = 0; i < 50; i++) assert.equal(visibility.sample({ ...frame, visible: false }), opacity);
    for (let i = 0; i < 14; i++) visibility.sample(frame);
    assert.equal(visibility.opacity, 1);
});

test('section/foreign/return and wrong physical ring copy are immediately hidden and replay safely', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
    for (const changed of [{ phase: 'travel' }, { phase: 'section' }, { phase: 'foreign' }, { selectedIndex: 0 }, { active: false }]) {
        assert.equal(visibility.sample({ ...frame, ...changed }), 0);
        assert.equal(visibility.sample(frame), 0);
        visibility.sample({ ...frame, skip: true });
    }
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
});

test('reduced motion/Save Data is immediate static decor and frame spikes are bounded', () => {
    const visibility = createMenuDecorationVisibility();
    assert.equal(visibility.sample({ ...frame, skip: true }), 1);
    visibility.sample({ ...frame, phase: 'section' });
    for (const delta of [NaN, -1, Infinity, 30]) assert.equal(visibility.sample({ ...frame, delta }), 0);
    assert.ok(visibility.elapsed <= 0.05);
});
