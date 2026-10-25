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

test('custom shadow direction is valid and preserved without snapping to a cardinal preset', () => {
    const saved = normalizeVisualEffects();
    assert.equal(saved.shadows.directionDegrees, 143);
    const draft = normalizeVisualEffects(saved);
    draft.shadows.directionDegrees = '143';
    draft.shadows.length = '0.55';
    assert.deepEqual(validateVisualEffectsDraft(draft), {});
    assert.equal(visualEffectsDraftEqual(draft, saved), true);
    draft.shadows.directionDegrees = '143.25';
    assert.deepEqual(validateVisualEffectsDraft(draft), {});
    assert.equal(visualEffectsDraftEqual(draft, saved), false);
    assert.equal(normalizeVisualEffects(draft).shadows.directionDegrees, 143.25);
    assert.equal(saved.shadows.directionDegrees, 143);
    draft.shadows.enabled = false;
    draft.shadows.opacity = 0;
    draft.shadows.blur = 0;
    assert.deepEqual(validateVisualEffectsDraft(draft), {});
});

test('shadow depth changes are dirty, validate both signs, and return to clean at zero', () => {
    const saved = normalizeVisualEffects();
    const draft = normalizeVisualEffects(saved);
    for (const value of ['-0.15', '0.15']) {
        draft.shadows.depthOffset = value;
        assert.deepEqual(validateVisualEffectsDraft(draft), {});
        assert.equal(visualEffectsDraftEqual(draft, saved), false);
    }
    draft.shadows.depthOffset = '1.01';
    assert.ok(validateVisualEffectsDraft(draft)['shadows.depthOffset']);
    draft.shadows.depthOffset = '0';
    assert.equal(visualEffectsDraftEqual(draft, saved), true);
});

test('menu caption color validates before fallback and equivalent hex forms are not dirty', () => {
    const saved = normalizeVisualEffects({ menuCaptions: { color: '#aabbcc' } });
    const draft = normalizeVisualEffects(saved);
    for (const color of ['#ABC', ' #AaBbCc ', '#abc']) {
        draft.menuCaptions.color = color;
        assert.deepEqual(validateVisualEffectsDraft(draft), {});
        assert.equal(visualEffectsDraftEqual(draft, saved), true);
    }
    draft.menuCaptions.color = '#000';
    assert.deepEqual(validateVisualEffectsDraft(draft), {});
    assert.equal(visualEffectsDraftEqual(draft, saved), false);
    assert.equal(normalizeVisualEffects(draft).menuCaptions.color, '#000000');
    const defaults = normalizeVisualEffects();
    defaults.menuCaptions.color = '#FFF';
    assert.equal(visualEffectsDraftEqual(defaults, VISUAL_EFFECTS_DEFAULTS), true);
    for (const color of [undefined, null, '', ' ', '#ffff', '#ffffff80', 'white', 'transparent', 'url(x)', 'var(--caption)']) {
        defaults.menuCaptions.color = color;
        assert.ok(validateVisualEffectsDraft(defaults)['menuCaptions.color']);
        assert.equal(visualEffectsDraftEqual(defaults, VISUAL_EFFECTS_DEFAULTS), false);
    }
    delete defaults.menuCaptions;
    assert.ok(validateVisualEffectsDraft(defaults)['menuCaptions.color']);
    assert.equal(visualEffectsDraftEqual(defaults, VISUAL_EFFECTS_DEFAULTS), false);
    assert.equal(saved.menuCaptions.color, '#aabbcc');
});
