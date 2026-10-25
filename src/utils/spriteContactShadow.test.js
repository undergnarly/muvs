import test from 'node:test';
import assert from 'node:assert/strict';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import {
    analyzeSpriteShadowMask, getSpriteShadowMaskBounds, createSpriteShadowLayout,
    SPRITE_SHADOW_MASK_SIZE,
} from './spriteShadow.js';

const close = (actual, expected, tolerance = 2e-6) => {
    assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};
const maskPixels = (width, height, alpha, green = () => 177) => {
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        pixels[offset] = (x * 71 + y * 37) % 256;
        pixels[offset + 1] = green(x, y);
        pixels[offset + 2] = (x * 19 + y * 59) % 256;
        pixels[offset + 3] = alpha(x, y);
    }
    return pixels;
};
const slopedPixels = () => maskPixels(8, 8, (x, y) => {
    const bottom = [null, 4, 5, null, 6, 5, 4, null][x];
    if (bottom != null && y >= 1 && y <= bottom) return 255;
    return y === 7 ? 96 : 0;
});
const withProfile = () => analyzeSpriteShadowMask(slopedPixels(), 8, 8, { includeFootProfile: true });
const settings = Object.freeze({ enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 });
const layoutInput = bounds => ({ width: 2.55, height: 2.55, position: [0, -.05, 0], bounds, settings });
const legacyFieldsEqual = (actual, expected) => {
    assert.deepEqual(actual.positions.slice(0, 12), expected.positions);
    assert.deepEqual(actual.uvs.slice(0, 8), expected.uvs);
    assert.deepEqual(actual.indices.slice(0, 6), expected.indices);
    for (const key of ['contact', 'footY', 'opaqueHeight', 'length', 'padding', 'maximumBlur', 'basis',
        'depthOffset', 'depthShift', 'footV', 'maxV', 'worldToUv']) {
        assert.deepEqual(actual[key], expected[key], `the original cast's ${key} must stay unchanged`);
    }
};
const vertex = (layout, index) => new Vector3().fromArray(layout.positions, index * 3);
const appendedVertices = layout => Array.from({ length: layout.positions.length / 3 - 4 }, (_, index) => index + 4);
const findVertex = (layout, point, tolerance = 3e-6) => appendedVertices(layout)
    .find(index => vertex(layout, index).distanceTo(point) <= tolerance);
const footPoint = (input, point) => new Vector3(
    input.position[0] + (point.u - .5) * input.width,
    input.position[1] + (point.v - .5) * input.height,
    input.position[2],
);
const groundIntersection = (camera, point, floorY) => {
    const origin = new Vector3(...camera);
    const amount = (floorY - origin.y) / (point.y - origin.y);
    return origin.add(point.clone().sub(origin).multiplyScalar(amount));
};
const originalCastPoint = (input, layout, point) => {
    const side = (point.u - input.bounds.footU) * input.width;
    const depth = (point.sampleV - input.bounds.footV) * input.height * settings.length;
    return new Vector3(layout.contact[0] + side + layout.basis.castX * depth,
        layout.contact[1], layout.contact[2] + layout.basis.castZ * depth);
};

test('opt-in contact profile samples each solid lower edge, not translucent spray or RGB decoration', () => {
    const pixels = slopedPixels();
    const plain = analyzeSpriteShadowMask(pixels, 8, 8);
    assert.equal(plain.footProfile, undefined, 'all existing mask consumers remain opt-out');
    const bounds = withProfile();
    assert.ok(Array.isArray(bounds.footProfile));
    assert.equal(bounds.footProfile.length, 8);
    assert.ok(Object.isFrozen(bounds.footProfile));
    for (const column of [0, 3, 7]) assert.equal(bounds.footProfile[column], null);
    for (const [column, bottom] of [[1, 4], [2, 5], [4, 6], [5, 5], [6, 4]]) {
        const point = bounds.footProfile[column];
        assert.ok(Object.isFrozen(point));
        close(point.u, (column + .5) / 8);
        close(point.v, 1 - (bottom + .5) / 8);
        close(point.sampleV, Math.min(bounds.maxV, point.v + 1 / 8));
    }
    const recolored = pixels.slice();
    for (let index = 0; index < recolored.length; index += 4) {
        recolored[index] = 255 - recolored[index];
        recolored[index + 1] = 255;
        recolored[index + 2] = 0;
    }
    assert.deepEqual(analyzeSpriteShadowMask(recolored, 8, 8, { includeFootProfile: true }), bounds);
});

test('contact edge respects raw orientation, green sidecars and normalized masks without inventing RGB outlines', () => {
    const pixels = maskPixels(4, 6, () => 0, (x, y) => x >= 1 && x <= 2 && y >= x && y <= x + 2 ? 255 : 0);
    const transparent = analyzeSpriteShadowMask(pixels, 4, 6, { includeFootProfile: true });
    assert.equal(transparent.empty, true);
    assert.ok(!transparent.footProfile || transparent.footProfile.every(point => point === null));
    const flipped = analyzeSpriteShadowMask(pixels, 4, 6, { includeFootProfile: true, useGreen: true });
    const raw = analyzeSpriteShadowMask(pixels, 4, 6, { includeFootProfile: true, useGreen: true, flipY: false });
    assert.ok(Array.isArray(flipped.footProfile));
    assert.ok(Array.isArray(raw.footProfile));
    for (const column of [0, 3]) {
        assert.equal(flipped.footProfile[column], null);
        assert.equal(raw.footProfile[column], null);
    }
    for (const column of [1, 2]) {
        close(flipped.footProfile[column].v, 1 - (column + 2.5) / 6);
        close(raw.footProfile[column].v, (column + .5) / 6);
        close(raw.footProfile[column].sampleV, Math.min(raw.maxV, raw.footProfile[column].v + 1 / 6));
    }
    const normalized = Float32Array.from(pixels, value => value / 255);
    assert.deepEqual(analyzeSpriteShadowMask(normalized, 4, 6,
        { includeFootProfile: true, useGreen: true, normalized: true }), flipped);
});

test('contact requests append finite flat bridge geometry without modifying any existing cast data or saved setting', () => {
    const bounds = withProfile();
    const input = layoutInput(bounds);
    const before = JSON.stringify(input);
    const legacy = createSpriteShadowLayout(input);
    const extended = createSpriteShadowLayout({ ...input, contactCamera: [0, .4, 7] });
    assert.ok(extended.positions.length > 12);
    assert.ok(extended.uvs.length > 8);
    assert.ok(extended.indices.length > 6);
    legacyFieldsEqual(extended, legacy);
    assert.notEqual(extended.geometryKey, legacy.geometryKey, 'a contact bridge needs its own memoized geometry key');
    assert.equal(JSON.stringify(input), before);
    assert.deepEqual(input.settings, settings);
    assert.ok([...extended.positions, ...extended.uvs].every(Number.isFinite));
    assert.equal(extended.positions.length / 3, extended.uvs.length / 2);
    assert.equal(extended.indices.length % 3, 0);
    for (const index of extended.indices) assert.ok(index < extended.positions.length / 3);
    for (const index of appendedVertices(extended)) close(vertex(extended, index).y, extended.contact[1]);
    assert.equal(extended.contactBlend.length, extended.positions.length / 3);
    assert.deepEqual([...extended.contactBlend.slice(0, 4)], [0, 0, 0, 0]);
    assert.ok([...extended.contactBlend].every(value => value >= 0 && value <= 1));
    assert.ok(extended.contactBlend.includes(1), 'the actual foot edge uses solid occlusion, not magnified alpha fringing');
});

test('foot-contact geometry is opted in only for Radio, with one mesh and no frame/readback loop', () => {
    const home = readFileSync(new URL('../components/pages/HomeNewPage.jsx', import.meta.url), 'utf8');
    const menu = readFileSync(new URL('../components/pages/RingMenu.jsx', import.meta.url), 'utf8');
    const renderer = readFileSync(new URL('../components/media/SpriteShadow.jsx', import.meta.url), 'utf8');
    assert.match(home, /shadowContactCamera=\{activeKey === 'radio' \? \[cfg\.stops\[0\]\.pos\.x, cfg\.stops\[0\]\.pos\.y - 2\.6, cfg\.stops\[0\]\.pos\.z\] : undefined\}/);
    assert.match(menu, /shadowContactCamera=\{item\.key === 'radio' \? radioContactCamera : undefined\}/);
    assert.match(menu, /const viewportWidth = useThree\(state => state\.size\.width\)/);
    assert.equal((renderer.match(/<mesh\b/g) || []).length, 1);
    assert.doesNotMatch(renderer, /useFrame|requestAnimationFrame|fetch\(|new (?:Texture|CanvasTexture|ShaderMaterial|BufferGeometry)/);
    assert.match(renderer, /attributes-contactBlend/);
});

test('each near edge is the sprite-foot ray projected onto the same floor and each far edge joins the original cast UV', () => {
    const input = layoutInput(withProfile());
    const contactCamera = [0, .4, 7];
    const layout = createSpriteShadowLayout({ ...input, contactCamera });
    assert.ok(layout.positions.length > 12);
    for (const point of input.bounds.footProfile.filter(Boolean)) {
        const nearPoint = groundIntersection(contactCamera, footPoint(input, point), layout.contact[1]);
        const nearIndex = findVertex(layout, nearPoint);
        assert.notEqual(nearIndex, undefined, `missing grounded contact at u=${point.u}`);
        const farPoint = originalCastPoint(input, layout, point);
        const farIndex = findVertex(layout, farPoint);
        assert.notEqual(farIndex, undefined, `missing unchanged-cast join at u=${point.u}`);
        close(layout.uvs[farIndex * 2], point.u);
        close(layout.uvs[farIndex * 2 + 1], point.sampleV);
    }
});

test('actual Three projection keeps sloping receiver feet attached at 320, 390 and 1440 pixels under scene-parent transforms', () => {
    const input = layoutInput(withProfile());
    const contactCamera = [0, .4, 7];
    const layout = createSpriteShadowLayout({ ...input, contactCamera });
    assert.ok(layout.positions.length > 12);
    for (const [width, height] of [[320, 740], [390, 844], [1440, 900]]) {
        for (const pose of [
            { position: [0, 0, 0], rotation: [0, 0, 0] },
            { position: [98, 2.6, -56], rotation: [0, Math.PI, 0] },
        ]) {
            const parent = new Object3D();
            parent.position.fromArray(pose.position);
            parent.rotation.fromArray(pose.rotation);
            parent.updateMatrixWorld(true);
            const camera = new PerspectiveCamera(56, width / height, .1, 1000);
            camera.position.copy(new Vector3(...contactCamera).applyMatrix4(parent.matrixWorld));
            camera.lookAt(new Vector3(0, 0, -10.7).applyMatrix4(parent.matrixWorld));
            camera.updateMatrixWorld(true);
            for (const point of input.bounds.footProfile.filter(Boolean)) {
                const sprite = footPoint(input, point);
                const intersection = groundIntersection(contactCamera, sprite, layout.contact[1]);
                const nearIndex = findVertex(layout, intersection);
                assert.notEqual(nearIndex, undefined);
                const projectedFoot = sprite.applyMatrix4(parent.matrixWorld).project(camera);
                const projectedContact = vertex(layout, nearIndex).applyMatrix4(parent.matrixWorld).project(camera);
                close((projectedContact.x - projectedFoot.x) * width / 2, 0, .015);
                close((projectedContact.y - projectedFoot.y) * height / 2, 0, .015);
            }
        }
    }
});

test('contact bridge changes neither cast direction nor length, blur, opacity or signed admin depth placement', () => {
    const bounds = withProfile();
    for (const directionDegrees of [0, 90, 143, 180, 270]) for (const depthOffset of [-.7, 0, .42, 1]) {
        const input = { ...layoutInput(bounds), settings: { ...settings, directionDegrees, depthOffset } };
        const legacy = createSpriteShadowLayout(input);
        const extended = createSpriteShadowLayout({ ...input, contactCamera: [0, .4, 7] });
        assert.ok(extended.positions.length > 12);
        legacyFieldsEqual(extended, legacy);
        close(extended.depthShift, -depthOffset * extended.opaqueHeight);
    }
});

test('no opt-in, absent profile and invalid camera requests leave legacy geometry and its key byte-identical', () => {
    const bounds = withProfile();
    const input = layoutInput(bounds);
    const legacy = createSpriteShadowLayout(input);
    assert.equal(legacy.positions.length, 12);
    assert.equal(legacy.uvs.length, 8);
    assert.equal(legacy.indices.length, 6);
    for (const contactCamera of [undefined, null, [], [0, 3], [NaN, 3, 7], [0, Infinity, 7], [0, 3, NaN], '0,3,7']) {
        const layout = createSpriteShadowLayout({ ...input, contactCamera });
        assert.deepEqual(layout.positions, legacy.positions);
        assert.deepEqual(layout.uvs, legacy.uvs);
        assert.deepEqual(layout.indices, legacy.indices);
        assert.equal(layout.geometryKey, legacy.geometryKey);
    }
    const plain = analyzeSpriteShadowMask(slopedPixels(), 8, 8);
    const withoutProfile = createSpriteShadowLayout(layoutInput(plain));
    const cannotBridge = createSpriteShadowLayout({ ...layoutInput(plain), contactCamera: [0, .4, 7] });
    assert.deepEqual(cannotBridge.positions, withoutProfile.positions);
    assert.deepEqual(cannotBridge.uvs, withoutProfile.uvs);
    assert.deepEqual(cannotBridge.indices, withoutProfile.indices);
    assert.equal(cannotBridge.geometryKey, withoutProfile.geometryKey);
});

test('empty, disabled, zero-opacity and invalid-size contact requests still allocate no shadow', () => {
    const input = { ...layoutInput(withProfile()), contactCamera: [0, .4, 7] };
    const empty = analyzeSpriteShadowMask(maskPixels(8, 8, () => 0), 8, 8, { includeFootProfile: true });
    for (const extra of [{ bounds: empty }, { settings: { ...settings, enabled: false } },
        { settings: { ...settings, opacity: 0 } }, { width: 0 }, { height: NaN }]) {
        assert.equal(createSpriteShadowLayout({ ...input, ...extra }), null);
    }
});

test('profile readback is bounded and cached separately from legacy bounds, channel and orientation', () => {
    const image = { width: 4096, height: 2048 };
    let draws = 0, reads = 0, canvas;
    const createCanvas = () => {
        canvas = { width: 0, height: 0, getContext: () => ({
            drawImage() { draws++; },
            getImageData(x, y, width, height) {
                reads++;
                return { data: maskPixels(width, height, (px, py) => px > 3 && py < height - px / 4 ? 255 : 0) };
            },
        }) };
        return canvas;
    };
    const legacy = getSpriteShadowMaskBounds(image, { createCanvas });
    assert.equal(legacy.footProfile, undefined);
    const bounds = getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true });
    assert.ok(Array.isArray(bounds.footProfile));
    assert.notEqual(bounds, legacy, 'an earlier legacy cache entry cannot swallow a contact request');
    assert.equal(getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true }), bounds);
    assert.equal(getSpriteShadowMaskBounds(image, { createCanvas }), legacy);
    assert.ok(reads <= 2 && draws <= 2, 'each image/mode is sampled at most once');
    assert.equal(canvas.width, SPRITE_SHADOW_MASK_SIZE);
    assert.equal(canvas.height, SPRITE_SHADOW_MASK_SIZE / 2);
    assert.equal(bounds.footProfile.length, SPRITE_SHADOW_MASK_SIZE);
    const green = getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true, useGreen: true });
    const raw = getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true, flipY: false });
    assert.notEqual(green, bounds);
    assert.notEqual(raw, bounds);
    assert.equal(getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true, useGreen: true }), green);
    assert.equal(getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true, flipY: false }), raw);
    assert.ok(reads <= 4 && draws <= 4);
});

test('tainted/unreadable images cache a safe non-contact fallback and typed data needs no canvas', () => {
    const image = { width: 768, height: 768 };
    let attempts = 0;
    const createCanvas = () => {
        attempts++;
        return { getContext: () => ({ drawImage() { throw new Error('SecurityError'); } }) };
    };
    const bounds = getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true });
    assert.equal(bounds.readable, false);
    assert.ok(!bounds.footProfile || bounds.footProfile.every(point => point === null));
    assert.equal(getSpriteShadowMaskBounds(image, { createCanvas, includeFootProfile: true }), bounds);
    assert.equal(attempts, 1);
    const fallback = createSpriteShadowLayout({ ...layoutInput(bounds), contactCamera: [0, .4, 7] });
    assert.equal(fallback.positions.length, 12);
    const typed = { width: 8, height: 8, data: slopedPixels() };
    const fromTyped = getSpriteShadowMaskBounds(typed, { includeFootProfile: true,
        createCanvas() { throw new Error('Typed image pixels must not allocate a canvas'); } });
    assert.ok(Array.isArray(fromTyped.footProfile));
    assert.deepEqual(fromTyped, withProfile());
    assert.equal(getSpriteShadowMaskBounds(typed, { includeFootProfile: true }), fromTyped);
});
