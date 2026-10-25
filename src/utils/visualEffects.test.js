import test from 'node:test';
import assert from 'node:assert/strict';
import { isMenuCaptionColor, normalizeMenuCaptionColor, normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from './visualEffects.js';

test('menu caption colors accept only short or full opaque hex and normalize to canonical lowercase', () => {
    for (const [input, expected] of [
        ['#fff', '#ffffff'], ['#ABC', '#aabbcc'], ['#a1B', '#aa11bb'],
        ['#000000', '#000000'], ['#C0FFEE', '#c0ffee'], [' \t#AbC123\n', '#abc123'],
    ]) {
        assert.equal(isMenuCaptionColor(input), true);
        assert.equal(normalizeMenuCaptionColor(input), expected);
    }
    for (const invalid of [
        undefined, null, false, 0, 0xffffff, [], {}, () => '#fff',
        '', ' ', 'fff', '#ff', '#ffff', '#fffffff', '#ffffffff', '#ggg', '#fff x',
        'white', 'transparent', 'currentColor', 'rgb(255, 255, 255)',
        'rgba(255,255,255,.5)', 'var(--color)', 'url(https://example.invalid/color)',
        '#fff; background: url(x)', '#ff\nf',
    ]) {
        assert.equal(isMenuCaptionColor(invalid), false, String(invalid));
        assert.equal(normalizeMenuCaptionColor(invalid), '#ffffff', String(invalid));
    }
});

test('old presets gain white menu captions while valid saved colors remain independent of numeric effects', () => {
    const old = { transition: { opacity: .42 }, shadows: { directionDegrees: 143.25 } };
    const previous = normalizeVisualEffects(old);
    assert.deepEqual(previous.menuCaptions, { color: '#ffffff' });
    const saved = Object.freeze({ ...old, menuCaptions: Object.freeze({ color: ' #A1b ', enabled: false, unknown: 12 }) });
    const next = normalizeVisualEffects(saved);
    assert.deepEqual(next.menuCaptions, { color: '#aa11bb' });
    for (const group of Object.keys(VISUAL_EFFECTS_LIMITS)) assert.deepEqual(next[group], previous[group]);
    assert.equal(VISUAL_EFFECTS_LIMITS.menuCaptions, undefined);
    assert.equal(saved.menuCaptions.color, ' #A1b ');
    assert.equal(VISUAL_EFFECTS_DEFAULTS.menuCaptions.color, '#ffffff');
    assert.equal(Object.isFrozen(VISUAL_EFFECTS_DEFAULTS.menuCaptions), true);
    assert.deepEqual(normalizeVisualEffects(next), next);
    for (const menuCaptions of [null, [], false, '#123', { color: 'red' }, { color: '#abcd' }]) {
        assert.deepEqual(normalizeVisualEffects({ menuCaptions }).menuCaptions, { color: '#ffffff' });
    }
});

test('absent, old and invalid settings retain the current public appearance', () => {
    for (const input of [undefined, null, false, 0, '', [], {}, { handheld: [], filmDust: null }]) {
        assert.deepEqual(normalizeVisualEffects(input), VISUAL_EFFECTS_DEFAULTS);
    }
});

test('partial persisted tuning preserves zero opacity and independent family switches', () => {
    const value = normalizeVisualEffects({ transition: { opacity: 0, fadeOutMs: 0 }, handheld: { enabled: false, strength: 4 }, filmDust: { enabled: false } });
    assert.equal(value.transition.opacity, 0);
    assert.equal(value.transition.fadeOutMs, 0);
    assert.equal(value.handheld.enabled, false);
    assert.equal(value.handheld.strength, 4);
    assert.equal(value.filmDust.enabled, false);
    assert.deepEqual(value.lightLeaks, VISUAL_EFFECTS_DEFAULTS.lightLeaks);
});

test('film duration is independent of camera timing and old saved presets keep full-motion mode', () => {
    const value = normalizeVisualEffects({ transition: { durationSeconds: 2, effectDurationSeconds: .5, fadeOutMs: 100 } });
    assert.equal(value.transition.durationSeconds, 2);
    assert.equal(value.transition.effectDurationSeconds, .5);
    assert.equal(value.transition.fadeOutMs, 100);
    assert.equal(normalizeVisualEffects({ transition: { durationSeconds: 2 } }).transition.effectDurationSeconds, 0);
});

test('older saved presets gain main-object shadows without changing their film or camera tuning', () => {
    const old = { transition: { effectDurationSeconds: .5, opacity: .42 }, handheld: { strength: 2 } };
    const value = normalizeVisualEffects(old);
    assert.deepEqual(value.shadows, { enabled: true, opacity: .26, directionDegrees: 143, length: .55, blur: .5, depthOffset: 0 });
    assert.equal(value.transition.effectDurationSeconds, .5);
    assert.equal(value.transition.opacity, .42);
    assert.equal(value.handheld.strength, 2);
    assert.equal(old.shadows, undefined);
});

test('persisted shadow directions remain exact, including custom angles and range endpoints', () => {
    for (const directionDegrees of [0, 90, 143, 143.25, 180, 270, 360]) {
        const shadows = { enabled: false, opacity: 0, directionDegrees, length: .75, blur: 0, depthOffset: 0 };
        assert.deepEqual(normalizeVisualEffects({ shadows }).shadows, shadows);
    }
});

test('shadow depth defaults to no shift for existing presets and saves both signs independently', () => {
    const old = { enabled: true, directionDegrees: 180, length: 2.25, opacity: .26, blur: .5 };
    assert.deepEqual(normalizeVisualEffects({ shadows: old }).shadows, { ...old, depthOffset: 0 });
    for (const depthOffset of [-1, -.15, 0, .15, 1]) {
        assert.deepEqual(normalizeVisualEffects({ shadows: { ...old, depthOffset: String(depthOffset) } }).shadows,
            { ...old, depthOffset });
    }
    assert.equal(old.depthOffset, undefined);
});

test('every numeric field clamps to its safe range and rejects missing non-numbers', () => {
    for (const [group, fields] of Object.entries(VISUAL_EFFECTS_LIMITS)) for (const [key, [min, max]] of Object.entries(fields)) {
        const get = raw => normalizeVisualEffects({ [group]: { [key]: raw } })[group][key];
        // Interval ordering is tested separately, so keep its partner at the same bound.
        if (!key.startsWith('interval')) { assert.equal(get(-1e8), min); assert.equal(get(1e8), max); }
        for (const bad of ['', '  ', null, false, [], {}, NaN, Infinity, '-Infinity', 'invalid']) assert.equal(get(bad), VISUAL_EFFECTS_DEFAULTS[group][key]);
        assert.equal(get(String(VISUAL_EFFECTS_DEFAULTS[group][key])), VISUAL_EFFECTS_DEFAULTS[group][key]);
    }
});

test('inverted or extreme idle intervals always yield an ordered bounded random window', () => {
    for (const group of ['filmDust', 'lightLeaks']) {
        const value = normalizeVisualEffects({ [group]: { intervalMinSeconds: 80, intervalMaxSeconds: 4 } })[group];
        assert.equal(value.intervalMinSeconds, 4); assert.equal(value.intervalMaxSeconds, 80);
        const extreme = normalizeVisualEffects({ [group]: { intervalMinSeconds: -100, intervalMaxSeconds: 1e6 } })[group];
        assert.equal(extreme.intervalMinSeconds, 3); assert.equal(extreme.intervalMaxSeconds, 120);
    }
});

test('normalization is idempotent, drops unknown input and never mutates the defaults or saved object', () => {
    const input = Object.freeze({ handheld: Object.freeze({ strength: 2, secret: 'unused' }), future: { enabled: true } });
    const result = normalizeVisualEffects(input);
    assert.deepEqual(normalizeVisualEffects(result), result);
    assert.equal(result.handheld.secret, undefined); assert.equal(result.future, undefined);
    result.handheld.strength = 0;
    assert.equal(input.handheld.strength, 2); assert.equal(VISUAL_EFFECTS_DEFAULTS.handheld.strength, 1);
});
