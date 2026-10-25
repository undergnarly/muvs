import { RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS, normalizeRadioShadowProfiles } from '../../utils/radioShadows.js';
import { formatVisualNumber } from './visualEffectsAdminHelpers.js';

const number = value => (
    typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN
);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const fields = () => ['enabled', ...Object.keys(RADIO_SHADOW_LIMITS)];

/** Keep legacy partial overrides partial so changing their parent never makes them dirty. */
export function createRadioShadowDraft(profiles) {
    return Object.fromEntries(RADIO_SHADOW_TARGETS.map(({ id }) => {
        const source = profiles?.[id];
        const profile = { custom: source?.custom === true };
        for (const field of fields()) {
            if (own(source, field)) profile[field] = source[field];
        }
        return [id, profile];
    }));
}

/** Number inputs retain strings while typing, but inherited previews must use their numeric value. */
export function resolveRadioShadowDraftProfiles(draft, globalShadows) {
    const profiles = createRadioShadowDraft(draft);
    for (const { id } of RADIO_SHADOW_TARGETS) {
        for (const field of Object.keys(RADIO_SHADOW_LIMITS)) {
            if (own(profiles[id], field)) profiles[id][field] = number(profiles[id][field]);
        }
    }
    return normalizeRadioShadowProfiles(profiles, globalShadows);
}

export function validateRadioShadowDraft(draft) {
    const errors = {};
    for (const { id } of RADIO_SHADOW_TARGETS) {
        const profile = draft?.[id];
        if (!profile?.custom) continue;
        if (own(profile, 'enabled') && typeof profile.enabled !== 'boolean') {
            errors[`${id}.enabled`] = 'Выберите, показывать ли тень.';
        }
        for (const [field, [minimum, maximum]] of Object.entries(RADIO_SHADOW_LIMITS)) {
            if (!own(profile, field)) continue;
            const value = number(profile[field]);
            if (!Number.isFinite(value)) errors[`${id}.${field}`] = 'Укажите число.';
            else if (value < minimum || value > maximum) {
                errors[`${id}.${field}`] = `Допустимо от ${formatVisualNumber(minimum)} до ${formatVisualNumber(maximum)}.`;
            }
        }
    }
    return errors;
}

export function radioShadowProfileEqual(profile, saved) {
    if (Boolean(profile?.custom) !== Boolean(saved?.custom)) return false;
    if (!profile?.custom) return true;
    if (own(profile, 'enabled') !== own(saved, 'enabled')) return false;
    if (own(profile, 'enabled') && (typeof profile.enabled !== 'boolean' || profile.enabled !== saved.enabled)) return false;
    return Object.entries(RADIO_SHADOW_LIMITS).every(([field, [minimum, maximum]]) => {
        if (!own(profile, field) && !own(saved, field)) return true;
        if (own(profile, field) !== own(saved, field)) return false;
        const value = number(profile[field]);
        return Number.isFinite(value) && value >= minimum && value <= maximum && value === number(saved?.[field]);
    });
}

export function buildRadioShadowPatch(draft, saved) {
    if (Object.keys(validateRadioShadowDraft(draft)).length) throw new Error('Invalid Radio shadow settings');
    return Object.fromEntries(RADIO_SHADOW_TARGETS
        .filter(({ id }) => !radioShadowProfileEqual(draft[id], saved[id]))
        .map(({ id }) => [id, draft[id].custom ? {
            custom: true,
            ...(own(draft[id], 'enabled') ? { enabled: draft[id].enabled } : {}),
            ...Object.fromEntries(Object.keys(RADIO_SHADOW_LIMITS)
                .filter(field => own(draft[id], field))
                .map(field => [field, number(draft[id][field])])),
        } : { custom: false }]));
}
