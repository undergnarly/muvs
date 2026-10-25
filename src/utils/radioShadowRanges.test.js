import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSpriteShadowLayout, normalizeSpriteShadowSettings } from './spriteShadow.js';
import { RADIO_SHADOW_LIMITS, resolveRadioShadow } from './radioShadows.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test('Radio extended placement survives both normalizations into actual floor vertices', () => {
    const settings = { enabled: true, opacity: .7, directionDegrees: 215, length: 5.5, blur: .83, depthOffset: 3.4 };
    const normalized = normalizeSpriteShadowSettings(settings, RADIO_SHADOW_LIMITS);
    assert.deepEqual(normalized, settings);
    const base = createSpriteShadowLayout({ width: 2.55, height: 2.55, settings: { ...settings, depthOffset: 0 }, limits: RADIO_SHADOW_LIMITS });
    const shifted = createSpriteShadowLayout({ width: 2.55, height: 2.55, settings: normalized, limits: RADIO_SHADOW_LIMITS });
    near(shifted.length, shifted.opaqueHeight * 5.5);
    near(shifted.depthShift, -3.4 * shifted.opaqueHeight);
    near(shifted.maximumBlur, .83 * shifted.opaqueHeight * .11);
    for (let i = 0; i < shifted.positions.length; i++) near(shifted.positions[i] - base.positions[i], i % 3 === 2 ? shifted.depthShift : 0);
    assert.equal(shifted.positions.length, 12);
    assert.equal(shifted.indices.length, 6);
});

test('ordinary objects retain legacy length and depth clamps even when Radio common settings are extreme', () => {
    const settings = { length: 5.5, depthOffset: -3.4 };
    const legacy = normalizeSpriteShadowSettings(settings);
    assert.equal(legacy.length, 3);
    assert.equal(legacy.depthOffset, -1);
    const shape = createSpriteShadowLayout({ width: 2, height: 3, settings });
    near(shape.length, shape.opaqueHeight * 3);
    near(shape.depthShift, shape.opaqueHeight);
    const other = resolveRadioShadow({ all: { custom: true, length: 6, depthOffset: 5, opacity: 0 } }, undefined, settings);
    assert.deepEqual(other.settings, legacy);
    assert.equal(other.limits, undefined);
    for (const limits of [{ length: [NaN, 6], depthOffset: [-5, Infinity] }, { length: [4, 2], depthOffset: [1, 1] }, {}]) {
        assert.deepEqual(normalizeSpriteShadowSettings(settings, limits), legacy);
    }
});

test('Radio-only limits reach shared shadow and layout without moving the receiver', () => {
    const sprite = read('../components/media/SpriteShadow.jsx');
    assert.match(sprite, /normalizeSpriteShadowSettings\(settings, limits\)/);
    assert.match(sprite, /bounds: \{ minU, maxU, maxV, footU, footV, empty \}, limits/);
    assert.match(sprite, /config=\{config\} offsetX=\{offsetX\} limits=\{limits\}/);
    assert.match(read('../components/pages/HomeNewPage.jsx'), /offsetX=\{shadow.offsetX\} limits=\{shadow.limits\}/);
    assert.match(read('../components/pages/RingMenu.jsx'), /shadowLimits=\{item.key === 'radio' \? radioShadow.limits : undefined\}/);
});
