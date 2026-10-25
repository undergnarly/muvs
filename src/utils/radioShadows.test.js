import test from 'node:test';
import assert from 'node:assert/strict';
import {
    RADIO_SHADOW_DEFAULTS, RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS,
    mergeRadioShadowPatch, normalizeRadioShadowProfiles, resolveRadioShadow, upgradeRadioShadowProfiles,
} from './radioShadows.js';
import { normalizeSpriteShadowSettings } from './spriteShadow.js';

const globalShadow = { enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 };
const cast = (settings, offsetX = 0) => ({ settings, offsetX, limits: RADIO_SHADOW_LIMITS });

test('Radio has a section-wide profile and four independently inheritable receivers', () => {
    assert.deepEqual(RADIO_SHADOW_TARGETS.map(target => target.id), ['all', 'menu', 'roots', 'y2k', 'new-era']);
    const profiles = normalizeRadioShadowProfiles();
    for (const { id } of RADIO_SHADOW_TARGETS) {
        assert.deepEqual(profiles[id], RADIO_SHADOW_DEFAULTS);
        assert.deepEqual(resolveRadioShadow(undefined, id, globalShadow), cast(globalShadow));
        assert.deepEqual(normalizeRadioShadowProfiles({}, globalShadow)[id], { custom: false, ...globalShadow, offsetX: 0 });
    }
    profiles.menu.length = 1.4;
    assert.equal(profiles.roots.length, RADIO_SHADOW_DEFAULTS.length);
});

test('section-wide Radio controls apply to the menu and every era without changing global data', () => {
    const all = { custom: true, enabled: false, opacity: .48, directionDegrees: 270, length: 5.6, blur: .9, offsetX: -5.2, depthOffset: 4.2 };
    const expected = { enabled: false, opacity: .48, directionDegrees: 270, length: 5.6, blur: .9, depthOffset: 4.2 };
    const raw = { all };
    for (const target of ['all', 'menu', 'roots', 'y2k', 'new-era']) assert.deepEqual(resolveRadioShadow(raw, target, globalShadow), cast(expected, -5.2));
    assert.deepEqual(globalShadow, { enabled: true, opacity: .91, directionDegrees: 180, length: 2.25, blur: .64, depthOffset: .42 });
    assert.equal(raw.all, all);
});

test('specific eras override the section profile; inheritance can be restored without deleting old data', () => {
    const all = { custom: true, enabled: false, opacity: .6, directionDegrees: 230, length: 4.3, blur: .8, offsetX: -3.4, depthOffset: 3.1 };
    const raw = { all, roots: { custom: true, enabled: true, opacity: .2, length: 1.2, offsetX: .4, depthOffset: -2.1 } };
    const expectedRoots = { enabled: true, opacity: .2, directionDegrees: 230, length: 1.2, blur: .8, depthOffset: -2.1 };
    assert.deepEqual(resolveRadioShadow(raw, 'roots', globalShadow), cast(expectedRoots, .4));
    const inherited = mergeRadioShadowPatch(raw, { roots: { custom: false } });
    assert.equal(inherited.roots.length, 1.2);
    assert.deepEqual(resolveRadioShadow(inherited, 'roots', globalShadow), resolveRadioShadow(raw, 'y2k', globalShadow));
    const normalized = normalizeRadioShadowProfiles(inherited, globalShadow);
    assert.deepEqual(normalized.roots, { ...normalized.all, custom: false });
});

test('legacy three-field custom profiles inherit missing style from the current parent, never fixed defaults', () => {
    const legacy = { custom: true, length: 1.2, offsetX: -.3, depthOffset: -.18 };
    const raw = { roots: legacy };
    assert.deepEqual(resolveRadioShadow(raw, 'roots', globalShadow), cast({ ...globalShadow, length: 1.2, depthOffset: -.18 }, -.3));
    const nextGlobal = { ...globalShadow, enabled: false, opacity: .15, blur: .23, directionDegrees: 32 };
    assert.deepEqual(resolveRadioShadow(raw, 'roots', nextGlobal), cast({ ...nextGlobal, length: 1.2, depthOffset: -.18 }, -.3));
    raw.all = { custom: true, enabled: true, opacity: .7, blur: .82, directionDegrees: 222, offsetX: 3, depthOffset: 3, length: 5 };
    assert.deepEqual(resolveRadioShadow(raw, 'roots', nextGlobal), cast({ enabled: true, opacity: .7, blur: .82, directionDegrees: 222, length: 1.2, depthOffset: -.18 }, -.3));
    const saved = mergeRadioShadowPatch(raw, { roots: { length: 1.4 } });
    assert.deepEqual(saved.roots, { ...legacy, length: 1.4 });
    assert.equal(Object.hasOwn(saved.roots, 'opacity'), false);
});

test('Radio settings never leak to unknown/non-Radio objects or change their global clamping', () => {
    const raw = { all: { custom: true, enabled: false, opacity: .1, length: 6, offsetX: 6, depthOffset: 5 } };
    const untrustedGlobal = { ...globalShadow, length: 9, depthOffset: -9 };
    for (const target of ['music', 'code', '', undefined, null, '__proto__', 'future-radio']) {
        assert.deepEqual(resolveRadioShadow(raw, target, untrustedGlobal), { settings: normalizeSpriteShadowSettings(untrustedGlobal), offsetX: 0 });
    }
});

test('public normalization tolerates malformed data without coercion, clamps expanded bounds and does not mutate input', () => {
    for (const raw of [null, [], 'bad', 3, true]) assert.deepEqual(normalizeRadioShadowProfiles(raw), normalizeRadioShadowProfiles());
    const raw = { all: { custom: true, opacity: .75, blur: .8 }, roots: { custom: true, enabled: 'false', opacity: Infinity, length: Infinity, offsetX: '2', depthOffset: NaN }, y2k: { custom: true, length: 100, offsetX: -100, depthOffset: 100, directionDegrees: 999, opacity: -1, blur: 100 }, future: { custom: true } };
    const snapshot = structuredClone(raw);
    assert.deepEqual(normalizeRadioShadowProfiles(raw).roots, { ...RADIO_SHADOW_DEFAULTS, custom: true, opacity: .75, blur: .8 });
    assert.deepEqual(normalizeRadioShadowProfiles(raw).y2k, { custom: true, enabled: true, opacity: 0, directionDegrees: 360, length: 6, blur: 1, offsetX: -6, depthOffset: 5 });
    assert.equal(Object.keys(normalizeRadioShadowProfiles(raw)).length, 5);
    assert.deepEqual(raw, snapshot);
    assert.deepEqual(resolveRadioShadow({}, 'menu', null).settings, normalizeSpriteShadowSettings());
});

test('strict patches reject malformed branches, unknown fields, booleans and numeric values atomically', () => {
    const previous = { menu: { custom: false }, roots: { custom: true, length: 1.5, offsetX: -.1, depthOffset: .2 } };
    const snapshot = structuredClone(previous);
    for (const patch of [null, [], 0, 'bad', { nope: { custom: false } }, { roots: null }, { roots: [] }, { roots: {} }, { roots: { unexpected: .5 } }, { roots: { custom: 'yes' } }, { roots: { enabled: 1 } }, { roots: { length: '1' } }, { roots: { offsetX: Infinity } }, { roots: { depthOffset: null } }, JSON.parse('{"__proto__":{"custom":false}}'), { roots: { length: 2 }, menu: { enabled: 'yes' } }]) {
        assert.throws(() => mergeRadioShadowPatch(previous, patch), TypeError);
        assert.deepEqual(previous, snapshot);
    }
    for (const [field, [min, max]] of Object.entries(RADIO_SHADOW_LIMITS)) {
        for (const value of [min - .01, max + .01, NaN]) assert.throws(() => mergeRadioShadowPatch(previous, { roots: { [field]: value } }), TypeError);
        for (const value of [min, max]) assert.equal(mergeRadioShadowPatch(previous, { roots: { [field]: value } }).roots[field], value);
    }
    for (const enabled of [false, true]) assert.equal(mergeRadioShadowPatch(previous, { all: { enabled } }).all.enabled, enabled);
});

test('partial patches preserve other targets and unknown existing metadata without freezing inherited style', () => {
    const oldRoots = { custom: true, length: 1.2, offsetX: .1, depthOffset: .2, futureMetadata: { keep: true } };
    const previous = { roots: oldRoots, 'future-era': { keep: true } };
    const all = { custom: true, enabled: true, opacity: .4, directionDegrees: 121, length: 5, blur: .81, offsetX: -5, depthOffset: 4.3 };
    const next = mergeRadioShadowPatch(previous, { all, roots: { custom: false }, menu: { custom: true, length: 2, offsetX: -.3, depthOffset: -.12 } });
    assert.deepEqual(next.roots, { ...oldRoots, custom: false });
    assert.deepEqual(next.menu, { custom: true, length: 2, offsetX: -.3, depthOffset: -.12 });
    assert.deepEqual(next.all, all);
    assert.deepEqual(next['future-era'], { keep: true });
    assert.equal(previous.roots.custom, true);
    assert.deepEqual(mergeRadioShadowPatch(previous, {}), previous);
});

test('legacy menu-only owner values become a virtual shared Radio preset without writing or inventing style fields', () => {
    const menu = { custom: true, length: 3, offsetX: .01, depthOffset: 1, futureMetadata: { keep: true } };
    const previous = { menu, roots: { custom: false }, 'future-era': { keep: true } };
    const snapshot = structuredClone(previous);
    const upgraded = upgradeRadioShadowProfiles(previous);
    assert.deepEqual(upgraded, { ...previous, all: menu, menu: { ...menu, custom: false } });
    assert.equal(Object.hasOwn(upgraded.all, 'opacity'), false);
    for (const target of ['all', 'menu', 'roots', 'y2k', 'new-era']) {
        assert.deepEqual(resolveRadioShadow(previous, target, globalShadow), cast({ ...globalShadow, length: 3, depthOffset: 1 }, .01));
    }
    assert.deepEqual(previous, snapshot);
    assert.deepEqual(mergeRadioShadowPatch(previous, { 'new-era': { custom: true, depthOffset: 3.8 } }), {
        ...upgraded, 'new-era': { custom: true, depthOffset: 3.8 },
    });
});

test('new deliberate menu-only edits carry a section marker and never get reinterpreted as legacy common values', () => {
    const menu = { custom: true, length: 4, offsetX: -4, depthOffset: 3 };
    const saved = mergeRadioShadowPatch({}, { menu });
    assert.deepEqual(saved, { all: { custom: false }, menu });
    assert.deepEqual(resolveRadioShadow(saved, 'menu', globalShadow), cast({ ...globalShadow, length: 4, depthOffset: 3 }, -4));
    assert.deepEqual(resolveRadioShadow(saved, 'roots', globalShadow), cast(globalShadow));
    assert.deepEqual(upgradeRadioShadowProfiles(saved), saved);
    for (const previous of [{ menu, roots: { custom: true, length: 2 } }, { all: { custom: false }, menu }]) {
        assert.deepEqual(upgradeRadioShadowProfiles(previous), previous);
    }
});

