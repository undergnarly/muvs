import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from './visualEffects.js';

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
