import { RADIO_SHADOW_LIMITS, RADIO_SHADOW_TARGETS } from '../../utils/radioShadows.js';
import { formatVisualNumber } from './visualEffectsAdminHelpers.js';

const number = value => (
    typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN
);

export function validateRadioShadowDraft(draft) {
    const errors = {};
    for (const { id } of RADIO_SHADOW_TARGETS) {
        const profile = draft?.[id];
        if (!profile?.custom) continue;
        for (const [field, [minimum, maximum]] of Object.entries(RADIO_SHADOW_LIMITS)) {
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
    return Object.entries(RADIO_SHADOW_LIMITS).every(([field, [minimum, maximum]]) => {
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
            ...Object.fromEntries(Object.keys(RADIO_SHADOW_LIMITS).map(field => [field, number(draft[id][field])])),
        } : { custom: false }]));
}
