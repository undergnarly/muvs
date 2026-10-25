import test from 'node:test';
import assert from 'node:assert/strict';
import { RADIO_SHADOW_LIMITS, normalizeRadioShadowProfiles } from '../../utils/radioShadows.js';
import { buildRadioShadowPatch, radioShadowProfileEqual, validateRadioShadowDraft } from './radioShadowsAdminHelpers.js';

test('an inherited Radio profile is clean regardless of unused numeric drafts', () => {
    const saved = normalizeRadioShadowProfiles();
    const draft = normalizeRadioShadowProfiles();
    draft.menu.length = '';
    draft.roots.offsetX = Infinity;
    assert.deepEqual(validateRadioShadowDraft(draft), {});
    assert.equal(radioShadowProfileEqual(draft.menu, saved.menu), true);
    assert.deepEqual(buildRadioShadowPatch(draft, saved), {});
});

test('custom Radio drafts reject blank and nonfinite values before normalization', () => {
    for (const value of ['', '   ', null, undefined, NaN, Infinity, '-Infinity', 'no']) {
        const draft = normalizeRadioShadowProfiles();
        draft.menu.custom = true;
        draft.menu.length = value;
        assert.equal(validateRadioShadowDraft(draft)['menu.length'], 'Укажите число.');
        assert.throws(() => buildRadioShadowPatch(draft, normalizeRadioShadowProfiles()), /Invalid Radio/);
    }
});

test('each custom Radio field validates both numeric limits without clamping a draft', () => {
    for (const [field, [minimum, maximum]] of Object.entries(RADIO_SHADOW_LIMITS)) {
        for (const value of [minimum - .01, maximum + .01]) {
            const draft = normalizeRadioShadowProfiles();
            draft.y2k.custom = true;
            draft.y2k[field] = value;
            assert.ok(validateRadioShadowDraft(draft)[`y2k.${field}`]);
            assert.equal(draft.y2k[field], value);
        }
    }
});

test('typed Radio numbers serialize as exact numeric values, never normalized defaults', () => {
    const saved = normalizeRadioShadowProfiles();
    const draft = normalizeRadioShadowProfiles();
    draft['new-era'] = { custom: true, length: '2.25', offsetX: '-1.42', depthOffset: '0.42' };
    assert.deepEqual(validateRadioShadowDraft(draft), {});
    assert.deepEqual(buildRadioShadowPatch(draft, saved), {
        'new-era': { custom: true, length: 2.25, offsetX: -1.42, depthOffset: .42 },
    });
    assert.equal(draft['new-era'].offsetX, '-1.42');
    assert.equal(saved['new-era'].custom, false);
});

test('equivalent custom numeric strings are clean; changing one target does not send the others', () => {
    const saved = normalizeRadioShadowProfiles({ menu: { custom: true, length: 2.25, offsetX: -1, depthOffset: .42 } });
    const draft = normalizeRadioShadowProfiles(saved);
    draft.menu.length = '2.250';
    draft.menu.offsetX = '-1.00';
    assert.equal(radioShadowProfileEqual(draft.menu, saved.menu), true);
    draft.roots.custom = true;
    draft.roots.depthOffset = '-0.25';
    draft.y2k.custom = true;
    draft.y2k.offsetX = '0.30';
    assert.deepEqual(Object.keys(buildRadioShadowPatch(draft, saved)), ['roots', 'y2k']);
});

test('returning one target to inheritance sends only its explicit custom false flag', () => {
    const saved = normalizeRadioShadowProfiles({ roots: { custom: true, length: 3, offsetX: 2, depthOffset: 1 } });
    const draft = normalizeRadioShadowProfiles(saved);
    draft.roots.custom = false;
    assert.deepEqual(buildRadioShadowPatch(draft, saved), { roots: { custom: false } });
    assert.equal(saved.roots.custom, true);
});

test('custom toggle itself is a real change even when all numeric values equal inherited defaults', () => {
    const saved = normalizeRadioShadowProfiles();
    const draft = normalizeRadioShadowProfiles();
    draft.menu.custom = true;
    assert.equal(radioShadowProfileEqual(draft.menu, saved.menu), false);
    assert.deepEqual(buildRadioShadowPatch(draft, saved), { menu: { custom: true, length: .55, offsetX: 0, depthOffset: 0 } });
});
