import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3 } from 'three';
import { VISUAL_EFFECTS_DEFAULTS } from './visualEffects.js';
import {
    SPRITE_SHADOW_DEFAULTS, SPRITE_SHADOW_MASK_SIZE, SPRITE_SHADOW_BIAS,
    analyzeSpriteShadowMask, getSpriteShadowMaskBounds, createSpriteShadowLayout,
    normalizeSpriteShadowSettings, spriteShadowBasis, spriteShadowOpacityAt,
    SPRITE_SHADOW_VERTEX, SPRITE_SHADOW_FRAGMENT,
} from './spriteShadow.js';

const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const pixels = (width, height, alpha, green = () => 77) => {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        data[offset] = (x * 43 + y * 17) % 256;
        data[offset + 1] = green(x, y);
        data[offset + 2] = (x * 29 + y * 59) % 256;
        data[offset + 3] = alpha(x, y);
    }
    return data;
};
const padded = () => analyzeSpriteShadowMask(pixels(4, 6, (x, y) => x >= 1 && x <= 2 && y >= 1 && y <= 4 ? 255 : 0), 4, 6);

test('shadow helper defaults match the persisted visual-style schema exactly', () => {
    assert.deepEqual(SPRITE_SHADOW_DEFAULTS, VISUAL_EFFECTS_DEFAULTS.shadows);
    for (const invalid of [undefined, null, [], '']) assert.deepEqual(normalizeSpriteShadowSettings(invalid), SPRITE_SHADOW_DEFAULTS);
    assert.deepEqual(normalizeSpriteShadowSettings({ enabled: false, opacity: 10, directionDegrees: 450, length: -1, blur: NaN }),
        { enabled: false, opacity: 1, directionDegrees: 90, length: .1, blur: .5, depthOffset: 0 });
    for (const [input, expected] of [[-5, -1], [-.4, -.4], [0, 0], [.3, .3], [5, 1], [NaN, 0], [Infinity, 0], [undefined, 0]]) {
        assert.equal(normalizeSpriteShadowSettings({ depthOffset: input }).depthOffset, expected);
    }
});

test('RGBA bounds and lowest opaque foot ignore every RGB color and transparent image padding', () => {
    const bounds = padded();
    near(bounds.minU, .25); near(bounds.maxU, .75);
    near(bounds.minV, 1 / 6); near(bounds.maxV, 5 / 6);
    near(bounds.footU, .5); near(bounds.footV, .25);
    assert.equal(bounds.empty, false);
    const otherRgb = pixels(4, 6, (x, y) => x >= 1 && x <= 2 && y >= 1 && y <= 4 ? 255 : 0, () => 0);
    assert.deepEqual(analyzeSpriteShadowMask(otherRgb, 4, 6), bounds);
    const shape = createSpriteShadowLayout({ width: 2, height: 3, position: [4, 2, -9], bounds });
    near(shape.footY, 1.25);
    near(shape.contact[0], 4); near(shape.contact[1], 1.25 + SPRITE_SHADOW_BIAS); near(shape.contact[2], -9);
    assert.ok(shape.footY > 2 - 3 / 2, 'the image-box bottom must not be used as the ground');
});

test('video sidecars use their GREEN silhouette, never opaque file alpha or colored video pixels', () => {
    const data = pixels(8, 8, () => 255, (x, y) => x >= 2 && x <= 5 && y >= 1 && y <= 6 ? 255 : 0);
    const rgba = analyzeSpriteShadowMask(data, 8, 8);
    const green = analyzeSpriteShadowMask(data, 8, 8, { useGreen: true });
    near(rgba.minU, 0); near(rgba.maxU, 1);
    near(green.minU, .25); near(green.maxU, .75);
    near(green.footV, 1 - 6.5 / 8);
    assert.ok(SPRITE_SHADOW_FRAGMENT.includes('mix(mask.a, mask.g, uGreen)'));
});

test('raw/unflipped textures preserve their actual UV orientation and RGB-only posters safely remain rectangles', () => {
    const data = pixels(4, 6, (x, y) => x >= 1 && x <= 2 && y >= 1 && y <= 4 ? 255 : 0);
    const raw = analyzeSpriteShadowMask(data, 4, 6, { flipY: false });
    near(raw.footV, 1.5 / 6);
    near(raw.minV, 1 / 6); near(raw.maxV, 5 / 6);
    const rgb = new Uint8Array(4 * 6 * 3);
    const rectangle = analyzeSpriteShadowMask(rgb, 4, 6, { channels: 3 });
    near(rectangle.minU, 0); near(rectangle.maxU, 1);
    near(rectangle.footV, .5 / 6);
    assert.equal(rectangle.empty, false);
});

test('opaque foot uses the lowest support band, not the center of an asymmetric image or its bounds', () => {
    const data = pixels(16, 16, (x, y) => y >= 2 && y <= 11 && x >= 2 && x <= 13
        || y >= 12 && y <= 14 && x === 11 ? 255 : 0);
    const bounds = analyzeSpriteShadowMask(data, 16, 16);
    near(bounds.footU, 11.5 / 16);
    near(bounds.footV, 1 - 14.5 / 16);
    const layout = createSpriteShadowLayout({ width: 4, height: 4, position: [0, 2.45, 0], bounds });
    near(layout.contact[0], (11.5 / 16 - .5) * 4);
});

test('all eight compass headings preserve the upright contact baseline while projecting nondegenerate silhouettes', () => {
    const bounds = padded();
    for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315, 360, 143]) {
        const basis = spriteShadowBasis(degrees);
        near(basis.rightX, 1); near(basis.rightZ, 0);
        near(Math.hypot(basis.castX, basis.castZ), 1);
        assert.ok(Math.abs(basis.castZ) >= .15, 'sideward shadows keep a minimum floor thickness');
        assert.ok(Math.abs(basis.rightX * basis.castZ - basis.rightZ * basis.castX) >= .15);
        const layout = createSpriteShadowLayout({ width: 2, height: 3, position: [4, 2, -9], bounds, settings: { directionDegrees: degrees } });
        assert.ok([...layout.positions, ...layout.uvs].every(Number.isFinite));
        for (let vertex = 0; vertex < 4; vertex++) near(layout.positions[vertex * 3 + 1], layout.contact[1]);
        const a = new Vector3().fromArray(layout.positions, 0);
        const b = new Vector3().fromArray(layout.positions, 3);
        const c = new Vector3().fromArray(layout.positions, 6);
        assert.ok(b.clone().sub(a).cross(c.clone().sub(a)).length() > .01);
        // Interpolate the generated quad at the actual alpha-foot UV row, not
        // its padded geometry edge: every base pixel remains under the sprite.
        for (const u of [bounds.minU, bounds.footU, bounds.maxU]) {
            const across = (u - layout.uvs[0]) / (layout.uvs[2] - layout.uvs[0]);
            const along = (bounds.footV - layout.uvs[1]) / (layout.uvs[5] - layout.uvs[1]);
            const base = a.clone().addScaledVector(b.clone().sub(a), across).addScaledVector(c.clone().sub(a), along);
            near(base.x, 4 + (u - .5) * 2, 2e-6);
            near(base.y, layout.contact[1], 2e-6);
            near(base.z, -9, 2e-6);
        }
    }
    near(spriteShadowBasis(0).castZ, -1); near(spriteShadowBasis(180).castZ, 1);
    for (const degrees of [90, 270]) {
        near(spriteShadowBasis(degrees).castZ, .15);
        near(Math.abs(spriteShadowBasis(degrees).castX), Math.sqrt(1 - .15 ** 2));
    }
    for (const degrees of [89, 91, 269, 271]) assert.ok(Math.abs(spriteShadowBasis(degrees).castZ) >= .15);
});

test('length is measured against opaque height, explicit scene ground is respected, and padding prevents blur clipping', () => {
    const bounds = padded();
    const layout = createSpriteShadowLayout({ width: 2, height: 3, bounds, floorY: -.9,
        settings: { directionDegrees: 0, length: 1.5, blur: 1 } });
    near(layout.contact[1], -.9 + SPRITE_SHADOW_BIAS);
    near(layout.length, layout.opaqueHeight * 1.5);
    assert.ok(layout.padding > layout.maximumBlur);
    assert.ok(Math.min(...[layout.uvs[0], layout.uvs[2], layout.uvs[4], layout.uvs[6]]) < bounds.minU);
    assert.ok(Math.max(...[layout.uvs[0], layout.uvs[2], layout.uvs[4], layout.uvs[6]]) > bounds.maxU);
    assert.ok(Math.max(...[layout.uvs[1], layout.uvs[3], layout.uvs[5], layout.uvs[7]]) > bounds.maxV);
    const crisp = createSpriteShadowLayout({ width: 2, height: 3, bounds, settings: { blur: 0 } });
    assert.equal(crisp.maximumBlur, 0);
    assert.ok(crisp.padding > 0);
});

test('ground geometry uses real perspective on phone views and keeps scene-parent transforms and contact fixed', () => {
    const layout = createSpriteShadowLayout({ width: 3.4, height: 3.4, bounds: padded(), position: [0, 0, 0], settings: { directionDegrees: 143 } });
    const camera = new PerspectiveCamera(50, 390 / 844, .1, 1000);
    camera.position.set(0, .15, 11); camera.lookAt(0, .05, 0); camera.updateMatrixWorld();
    const contact = new Vector3(...layout.contact);
    const tip = contact.clone().add(new Vector3(layout.basis.castX, 0, layout.basis.castZ).multiplyScalar(layout.length));
    const projection = contact.clone().project(camera);
    const farProjection = tip.clone().project(camera);
    assert.ok(projection.distanceTo(farProjection) > .005, 'a floor shadow must have projected depth, not be a screen-space blob');
    const translated = createSpriteShadowLayout({ width: 3.4, height: 3.4, bounds: padded(), position: [56, 0, 0] });
    near(translated.contact[0] - layout.contact[0], 56);
    near(translated.contact[1], layout.contact[1]);
});

test('manual depth offset translates the entire main shadow only along local Z by opaque height', () => {
    const bounds = padded();
    const input = { width: 2, height: 3, position: [4, 2, -9], floorY: .4, bounds };
    const before = JSON.stringify(input);
    for (const directionDegrees of [0, 90, 143, 180, 270]) for (const length of [.1, 2]) {
        const settings = { directionDegrees, length, blur: .8, opacity: .6 };
        const base = createSpriteShadowLayout({ ...input, settings });
        for (const depthOffset of [-1, -.35, 0, .4, 1]) {
            const shifted = createSpriteShadowLayout({ ...input, settings: { ...settings, depthOffset } });
            const shift = -depthOffset * base.opaqueHeight;
            near(shifted.contact[0], base.contact[0]);
            near(shifted.contact[1], base.contact[1]);
            near(shifted.contact[2] - base.contact[2], shift);
            near(shifted.depthOffset, depthOffset); near(shifted.depthShift, shift);
            for (let i = 0; i < base.positions.length; i++) {
                near(shifted.positions[i] - base.positions[i], i % 3 === 2 ? shift : 0, 2e-6);
            }
            for (const key of ['footY', 'opaqueHeight', 'length', 'padding', 'maximumBlur', 'footV', 'maxV']) near(shifted[key], base[key]);
            for (const key of ['basis', 'uvs', 'indices', 'worldToUv']) assert.deepEqual(shifted[key], base[key]);
            if (depthOffset) assert.notEqual(shifted.geometryKey, base.geometryKey);
            else assert.equal(shifted.geometryKey, base.geometryKey);
        }
    }
    assert.equal(JSON.stringify(input), before, 'the source object and authored floor must not move');
    const source = readFileSync(new URL('../components/media/SpriteShadow.jsx', import.meta.url), 'utf8');
    assert.match(source, /const \{ directionDegrees, length, blur, depthOffset \} = config/);
    assert.match(source, /floorY, directionDegrees, length, blur, depthOffset,/);
    assert.match(source, /depthOffset: layout\?\.depthOffset/);
});

test('transparent, disabled, zero-opacity and invalid-size sprites allocate no shadow geometry', () => {
    const empty = analyzeSpriteShadowMask(pixels(8, 8, () => 0), 8, 8);
    assert.equal(empty.empty, true);
    for (const extra of [{ settings: { enabled: false } }, { settings: { opacity: 0 } }, { bounds: empty }, { width: 0 }, { height: NaN }]) {
        assert.equal(createSpriteShadowLayout({ width: 3.4, height: 3.4, ...extra }), null);
    }
    assert.equal(spriteShadowOpacityAt(0), SPRITE_SHADOW_DEFAULTS.opacity);
    let previous = Infinity;
    for (let i = 0; i <= 100; i++) {
        const opacity = spriteShadowOpacityAt(i / 100);
        assert.ok(opacity <= previous);
        previous = opacity;
    }
    assert.ok(spriteShadowOpacityAt(1) < .001);
});

test('pixel readback is bounded, cached per image/channel/orientation, and tainted images fall back only once', () => {
    const image = { width: 4096, height: 2048 };
    let draws = 0, reads = 0, canvas;
    const createCanvas = () => {
        canvas = { width: 0, height: 0, getContext: () => ({
            drawImage() { draws++; },
            getImageData(x, y, width, height) { reads++; return { data: pixels(width, height, () => 255) }; },
        }) };
        return canvas;
    };
    const a = getSpriteShadowMaskBounds(image, { createCanvas });
    const b = getSpriteShadowMaskBounds(image, { createCanvas });
    assert.equal(a, b); assert.equal(draws, 1); assert.equal(reads, 1);
    assert.equal(canvas.width, SPRITE_SHADOW_MASK_SIZE); assert.equal(canvas.height, SPRITE_SHADOW_MASK_SIZE / 2);
    getSpriteShadowMaskBounds(image, { createCanvas, useGreen: true });
    assert.equal(reads, 2);
    const tainted = { width: 100, height: 100 };
    let attempts = 0;
    const blocked = () => { attempts++; return { getContext: () => ({ drawImage() { throw new Error('SecurityError'); } }) }; };
    const safe = getSpriteShadowMaskBounds(tainted, { createCanvas: blocked });
    assert.equal(safe.readable, false);
    assert.equal(getSpriteShadowMaskBounds(tainted, { createCanvas: blocked }), safe);
    assert.equal(attempts, 1);
    assert.ok(createSpriteShadowLayout({ width: 2, height: 3, bounds: safe }));
});

test('typed image masks need no browser canvas and incomplete images can be read after becoming ready', () => {
    const image = { width: 4, height: 6, data: pixels(4, 6, (x, y) => x >= 1 && x <= 2 && y >= 1 && y <= 4 ? 255 : 0) };
    assert.deepEqual(getSpriteShadowMaskBounds(image), padded());
    const loading = { width: 0, height: 0 };
    assert.equal(getSpriteShadowMaskBounds(loading).readable, false);
    Object.assign(loading, image);
    assert.deepEqual(getSpriteShadowMaskBounds(loading), padded());
});

test('one declarative mesh owns and disposes only its geometry/material, including StrictMode remounts', () => {
    const source = readFileSync(new URL('../components/media/SpriteShadow.jsx', import.meta.url), 'utf8');
    assert.equal((source.match(/<mesh\b/g) || []).length, 1);
    assert.ok(source.includes('<bufferGeometry key={layout.geometryKey}>'));
    assert.ok(source.includes('depthWrite={false}'));
    assert.ok(source.includes('raycast={ignoreRaycast}'));
    assert.ok(source.includes('renderOrder={-4}'));
    assert.ok(source.includes('new Color(\'#6f746e\')'));
    assert.doesNotMatch(source, /\.dispose\(|new (?:ShaderMaterial|BufferGeometry|Texture)|dispose=\{null\}|useFrame|requestAnimationFrame|fetch\(/);
    assert.equal((SPRITE_SHADOW_FRAGMENT.match(/texture2D\(/g) || []).length, 1, 'all nine taps share an alpha-only sampling helper');
    assert.ok(SPRITE_SHADOW_FRAGMENT.includes('radius = uMaximumBlur * pow(distance, 1.15)'));
    assert.ok(SPRITE_SHADOW_FRAGMENT.includes('alpha *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth)'));
    assert.ok(SPRITE_SHADOW_VERTEX.includes('projectionMatrix * mvPosition'));
});
