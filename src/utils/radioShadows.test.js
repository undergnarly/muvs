import test from 'node:test';
import assert from 'node:assert/strict';
import {
    RADIO_SHADOW_DEFAULTS, RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS,
    mergeRadioShadowPatch, normalizeRadioShadowProfiles, resolveRadioShadow,
} from './radioShadows.js';
import { normalizeSpriteShadowSettings } from './spriteShadow.js';

const globalShadow = { enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 };

test('Radio defaults cover only the menu and three eras and inherit the exact normalized global cast', () => {
    assert.deepEqual(RADIO_SHADOW_TARGETS.map(target => target.id), ['menu', 'roots', 'y2k', 'new-era']);
    const profiles = normalizeRadioShadowProfiles();
    for (const { id } of RADIO_SHADOW_TARGETS) {
        assert.deepEqual(profiles[id], RADIO_SHADOW_DEFAULTS);
        assert.deepEqual(resolveRadioShadow(undefined, id, globalShadow), { settings: globalShadow, offsetX: 0 });
        assert.deepEqual(resolveRadioShadow({ [id]: { ...RADIO_SHADOW_DEFAULTS, length: 3, offsetX: 2, depthOffset: -1 } }, id, globalShadow), { settings: globalShadow, offsetX: 0 });
    }
    assert.deepEqual(resolveRadioShadow({}, 'not-radio', globalShadow), { settings: globalShadow, offsetX: 0 });
});

test('only the chosen custom Radio target overrides length and position; global style and other objects stay unchanged', () => {
    const profiles = { roots: { custom: true, length: 1.2, offsetX: -.3, depthOffset: -.18 } };
    assert.deepEqual(resolveRadioShadow(profiles, 'roots', globalShadow), {
        settings: { ...globalShadow, length: 1.2, depthOffset: -.18 }, offsetX: -.3,
    });
    assert.deepEqual(resolveRadioShadow(profiles, 'y2k', globalShadow), { settings: globalShadow, offsetX: 0 });
    assert.deepEqual(globalShadow, { enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 });
    assert.equal(resolveRadioShadow(profiles, 'roots', { ...globalShadow, enabled: false }).settings.enabled, false);
    assert.deepEqual(resolveRadioShadow({}, 'menu', null).settings, normalizeSpriteShadowSettings());
});

test('public normalization tolerates bad data without coercion, retains bounded finite numbers and does not mutate input', () => {
    for (const raw of [null, [], 'bad', 3, true]) assert.deepEqual(normalizeRadioShadowProfiles(raw), normalizeRadioShadowProfiles());
    const raw = { roots: { custom: true, length: Infinity, offsetX: '2', depthOffset: NaN }, y2k: { custom: 'yes', length: 100, offsetX: -100, depthOffset: 4 }, future: { custom: true } };
    assert.deepEqual(normalizeRadioShadowProfiles(raw).roots, { ...RADIO_SHADOW_DEFAULTS, custom: true });
    assert.deepEqual(normalizeRadioShadowProfiles(raw).y2k, { custom: false, length: 3, offsetX: -3, depthOffset: 1 });
    assert.equal(Object.keys(normalizeRadioShadowProfiles(raw)).length, 4);
    assert.equal(raw.y2k.length, 100);
    const result = normalizeRadioShadowProfiles(); result.menu.length = 1.4;
    assert.equal(result.roots.length, RADIO_SHADOW_DEFAULTS.length);
});

test('strict Radio patches reject malformed branches, targets, fields and numeric values without partial mutation', () => {
    const previous = { menu: { custom: false }, roots: { custom: true, length: 1.5, offsetX: -.1, depthOffset: .2 } };
    const snapshot = structuredClone(previous);
    for (const patch of [null, [], 0, 'bad', { nope: { custom: false } }, { roots: null }, { roots: [] }, { roots: {} }, { roots: { opacity: .5 } }, { roots: { custom: 'yes' } }, { roots: { length: '1' } }, { roots: { offsetX: Infinity } }, { roots: { depthOffset: null } }, JSON.parse('{"__proto__":{"custom":false}}')]) {
        assert.throws(() => mergeRadioShadowPatch(previous, patch), TypeError);
        assert.deepEqual(previous, snapshot);
    }
    for (const [field, [min, max]] of Object.entries(RADIO_SHADOW_LIMITS)) {
        for (const value of [min - .01, max + .01, NaN]) assert.throws(() => mergeRadioShadowPatch(previous, { roots: { [field]: value } }), TypeError);
        for (const value of [min, max]) assert.equal(mergeRadioShadowPatch(previous, { roots: { [field]: value } }).roots[field], value);
    }
});

test('partial patches preserve other targets, existing values, future branches and support explicit global inheritance', () => {
    const oldRoots = { custom: true, length: 1.2, offsetX: .1, depthOffset: .2 };
    const previous = { roots: oldRoots, 'future-era': { keep: true } };
    const next = mergeRadioShadowPatch(previous, { roots: { custom: false }, menu: { custom: true, length: 2, offsetX: -.3, depthOffset: -.12 } });
    assert.deepEqual(next.roots, { ...oldRoots, custom: false });
    assert.deepEqual(next.menu, { custom: true, length: 2, offsetX: -.3, depthOffset: -.12 });
    assert.deepEqual(next['future-era'], { keep: true });
    assert.equal(previous.roots.custom, true);
    assert.deepEqual(mergeRadioShadowPatch(previous, {}), previous);
});

