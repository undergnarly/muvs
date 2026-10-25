import test from 'node:test';
import assert from 'node:assert/strict';
import { RADIO_SHADOW_LIMITS, normalizeRadioShadowProfiles } from '../../utils/radioShadows.js';
import { buildRadioShadowPatch, createRadioShadowDraft, radioShadowProfileEqual, resolveRadioShadowDraftProfiles, validateRadioShadowDraft } from './radioShadowsAdminHelpers.js';

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
    assert.deepEqual(buildRadioShadowPatch(draft, saved), { menu: { ...draft.menu, custom: true } });
});

test('common Radio profile supports all shadow settings and the expanded placement ranges', () => {
    const saved = createRadioShadowDraft();
    const draft = createRadioShadowDraft();
    draft.all = { custom: true, enabled: false, opacity: '0.83', directionDegrees: '360', length: '6', blur: '0.9', offsetX: '-6', depthOffset: '5' };
    assert.deepEqual(validateRadioShadowDraft(draft), {});
    assert.deepEqual(buildRadioShadowPatch(draft, saved), {
        all: { custom: true, enabled: false, opacity: .83, directionDegrees: 360, length: 6, blur: .9, offsetX: -6, depthOffset: 5 },
    });
});

test('enabled is an explicit boolean setting with validation, equality and serialization', () => {
    const saved = createRadioShadowDraft({ all: { custom: true, enabled: true } });
    const draft = createRadioShadowDraft(saved);
    draft.all.enabled = false;
    assert.equal(radioShadowProfileEqual(draft.all, saved.all), false);
    assert.deepEqual(buildRadioShadowPatch(draft, saved), { all: { custom: true, enabled: false } });
    for (const invalid of ['false', 0, null]) {
        draft.all.enabled = invalid;
        assert.equal(validateRadioShadowDraft(draft)['all.enabled'], 'Выберите, показывать ли тень.');
        assert.throws(() => buildRadioShadowPatch(draft, saved), /Invalid Radio/);
    }
});

test('legacy sparse receiver overrides stay sparse when the common Radio profile changes', () => {
    const saved = createRadioShadowDraft({
        all: { custom: true, enabled: true, opacity: .7, length: 1.5 },
        roots: { custom: true, length: 2.25, offsetX: .3, depthOffset: .42 },
    });
    const draft = createRadioShadowDraft(saved);
    draft.all.opacity = '.85';
    draft.all.blur = '.6';
    assert.deepEqual(validateRadioShadowDraft(draft), {});
    assert.equal(radioShadowProfileEqual(draft.roots, saved.roots), true);
    assert.deepEqual(buildRadioShadowPatch(draft, saved), { all: { custom: true, enabled: true, opacity: .85, length: 1.5, blur: .6 } });
    assert.equal(Object.hasOwn(draft.roots, 'opacity'), false);
    assert.equal(Object.hasOwn(draft.roots, 'enabled'), false);
    assert.equal(resolveRadioShadowDraftProfiles(draft).roots.opacity, .85);
    assert.equal(resolveRadioShadowDraftProfiles(draft).roots.blur, .6);
});

test('inherited editor fields and first custom capture use typed common numbers without changing drafts', () => {
    const draft = createRadioShadowDraft({ all: { custom: true, enabled: false, length: '4.2', depthOffset: '-3.1', offsetX: '5.2' } });
    const effective = resolveRadioShadowDraftProfiles(draft, { opacity: .91 });
    assert.equal(effective.roots.length, 4.2);
    assert.equal(effective.roots.depthOffset, -3.1);
    assert.equal(effective.roots.offsetX, 5.2);
    assert.equal(effective.roots.enabled, false);
    assert.equal(effective.roots.opacity, .91);
    assert.equal(draft.all.length, '4.2');
    assert.deepEqual(draft.roots, { custom: false });
});

test('draft cloning keeps only known target fields without sharing or filling a legacy profile', () => {
    const source = { roots: { custom: true, length: 2, arbitrary: 'drop' }, arbitrary: { custom: true } };
    const draft = createRadioShadowDraft(source);
    assert.deepEqual(draft.roots, { custom: true, length: 2 });
    assert.deepEqual(draft.all, { custom: false });
    assert.equal(Object.hasOwn(draft, 'arbitrary'), false);
    draft.roots.length = 3;
    assert.equal(source.roots.length, 2);
    assert.deepEqual(buildRadioShadowPatch(createRadioShadowDraft(source), createRadioShadowDraft(source)), {});
});
