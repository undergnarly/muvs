import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from '../../utils/visualEffects.js';
import { validateVisualEffectsDraft, visualEffectsDraftEqual } from './visualEffectsAdminHelpers.js';

test('the current visual preset is valid and draft checks never mutate its frozen defaults', () => {
    const before = JSON.stringify(VISUAL_EFFECTS_DEFAULTS);
    assert.deepEqual(validateVisualEffectsDraft(VISUAL_EFFECTS_DEFAULTS), {});
    assert.equal(visualEffectsDraftEqual(VISUAL_EFFECTS_DEFAULTS, normalizeVisualEffects()), true);
    assert.equal(JSON.stringify(VISUAL_EFFECTS_DEFAULTS), before);
});

test('blank, missing and nonfinite numeric controls cannot silently save normalized defaults', () => {
    for (const value of ['', '   ', undefined, null, NaN, Infinity, '-Infinity', 'no']) {
        const draft = normalizeVisualEffects();
        draft.transition.durationSeconds = value;
        assert.equal(validateVisualEffectsDraft(draft)['transition.durationSeconds'], 'Укажите число.');
        assert.equal(visualEffectsDraftEqual(draft, VISUAL_EFFECTS_DEFAULTS), false);
    }
});

test('all documented numeric limits are checked before the normalizer can clamp them', () => {
    for (const [group, fields] of Object.entries(VISUAL_EFFECTS_LIMITS)) {
        for (const [key, [minimum, maximum]] of Object.entries(fields)) {
            for (const value of [minimum - .01, maximum + .01]) {
                const draft = normalizeVisualEffects();
                draft[group][key] = value;
                assert.ok(validateVisualEffectsDraft(draft)[`${group}.${key}`]);
            }
        }
    }
});

test('each idle family reports both reversed interval fields instead of silently swapping values', () => {
    for (const group of ['lightLeaks', 'filmDust']) {
        const draft = normalizeVisualEffects();
        draft[group].intervalMinSeconds = '15';
        draft[group].intervalMaxSeconds = '9';
        const errors = validateVisualEffectsDraft(draft);
        assert.ok(errors[`${group}.intervalMinSeconds`]);
        assert.ok(errors[`${group}.intervalMaxSeconds`]);
        assert.equal(draft[group].intervalMinSeconds, '15');
        draft[group].intervalMaxSeconds = '15';
        assert.deepEqual(validateVisualEffectsDraft(draft), {});
    }
});

test('equivalent typed numbers are not dirty, but toggles, zero strength and real changes are', () => {
    const draft = normalizeVisualEffects();
    draft.transition.durationSeconds = '0.60';
    draft.transition.fadeOutMs = '100';
    assert.equal(visualEffectsDraftEqual(draft, VISUAL_EFFECTS_DEFAULTS), true);
    draft.transition.enabled = false;
    assert.equal(visualEffectsDraftEqual(draft, VISUAL_EFFECTS_DEFAULTS), false);
    draft.transition.enabled = true;
    draft.handheld.strength = 0;
    assert.equal(visualEffectsDraftEqual(draft, VISUAL_EFFECTS_DEFAULTS), false);
    assert.deepEqual(validateVisualEffectsDraft(draft), {});
});
