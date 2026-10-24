import { normalizeVisualEffects, VISUAL_EFFECTS_LIMITS } from '../../utils/visualEffects.js';

const numeric = value => (
    typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN
);
export const formatVisualNumber = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);

export function validateVisualEffectsDraft(draft) {
    const errors = {};
    for (const [group, fields] of Object.entries(VISUAL_EFFECTS_LIMITS)) {
        for (const [key, [minimum, maximum]] of Object.entries(fields)) {
            const number = numeric(draft?.[group]?.[key]);
            const field = `${group}.${key}`;
            if (!Number.isFinite(number)) errors[field] = 'Укажите число.';
            else if (number < minimum || number > maximum) {
                errors[field] = `Допустимо от ${formatVisualNumber(minimum)} до ${formatVisualNumber(maximum)}.`;
            }
        }
        const minimum = numeric(draft?.[group]?.intervalMinSeconds);
        const maximum = numeric(draft?.[group]?.intervalMaxSeconds);
        if (Number.isFinite(minimum) && Number.isFinite(maximum) && minimum > maximum) {
            errors[`${group}.intervalMinSeconds`] = 'Минимальный интервал не должен превышать максимальный.';
            errors[`${group}.intervalMaxSeconds`] = 'Максимальный интервал не должен быть меньше минимального.';
        }
    }
    return errors;
}

export function visualEffectsDraftEqual(draft, saved) {
    if (Object.keys(validateVisualEffectsDraft(draft)).length) return false;
    return JSON.stringify(normalizeVisualEffects(draft)) === JSON.stringify(normalizeVisualEffects(saved));
}
