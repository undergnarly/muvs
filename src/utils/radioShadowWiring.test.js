import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSpriteShadowLayout, SPRITE_SHADOW_VERTEX, SPRITE_SHADOW_FRAGMENT } from './spriteShadow.js';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Radio restores original one-quad casts without camera-derived contact bridges', () => {
    const layout = createSpriteShadowLayout({ width: 3, height: 3, settings: { length: 2.25, depthOffset: .42 } });
    assert.equal(layout.positions.length, 12);
    assert.equal(layout.indices.length, 6);
    assert.equal(layout.contactBlend, undefined);
    for (const text of [SPRITE_SHADOW_VERTEX, SPRITE_SHADOW_FRAGMENT,
        source('../components/media/SpriteShadow.jsx'), source('../components/pages/HomeNewPage.jsx'), source('../components/pages/RingMenu.jsx')]) {
        assert.doesNotMatch(text, /contactCamera|contactBlend|includeFootProfile|shadowContactCamera/);
    }
});

test('manual X translation changes shadow geometry only, preserving floor, UVs and dimensions', () => {
    const original = { width: 3, height: 4, position: [2, 1, -7], floorY: -.4,
        settings: { length: 2.25, depthOffset: .42, directionDegrees: 180, blur: .64 } };
    const base = createSpriteShadowLayout(original);
    for (const offsetX of [-3, -.35, 0, .6, 3]) {
        const next = createSpriteShadowLayout({ ...original, position: [original.position[0] + offsetX, ...original.position.slice(1)] });
        for (let i = 0; i < base.positions.length; i++) {
            assert.ok(Math.abs(next.positions[i] - base.positions[i] - (i % 3 === 0 ? offsetX : 0)) < 1e-5);
        }
        for (const key of ['uvs', 'indices', 'opaqueHeight', 'footY', 'depthShift', 'length', 'maximumBlur', 'worldToUv']) {
            assert.deepEqual(next[key], base[key]);
        }
    }
    const sprite = source('../components/media/SpriteShadow.jsx');
    assert.match(sprite, /Number\.isFinite\(offsetX\) \? offsetX : 0/);
    assert.match(sprite, /offsetX = 0/);
});

test('Radio menu and era profiles are scoped; other objects keep the global shadow and actual texture', () => {
    const home = source('../components/pages/HomeNewPage.jsx');
    const ring = source('../components/pages/RingMenu.jsx');
    assert.match(home, /radioShadowTarget=\{radioSection \? release\.slug : undefined\}/);
    assert.match(home, /radioSection=\{activeKey === 'radio'\}/);
    assert.match(home, /settings=\{shadow\.settings\} offsetX=\{shadow\.offsetX\}/);
    assert.match(ring, /resolveRadioShadow\(radioShadowProfiles, 'menu', shadowSettings\)/);
    assert.match(ring, /item\.key === 'radio' \? radioShadow\.settings : shadowSettings/);
    assert.match(ring, /item\.key === 'radio' \? radioShadow\.offsetX : 0/);
    assert.match(source('../components/media/ArtworkMaterial.jsx'), /fog=\{false\}/);
    assert.doesNotMatch(home, /updateSiteSettings\(\{ \.\.\.siteSettings/);
});
