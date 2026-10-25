import { normalizeSpriteShadowSettings } from './spriteShadow.js';

export const RADIO_SHADOW_TARGETS = Object.freeze([
    Object.freeze({ id: 'menu', label: 'Главное меню — Radio' }),
    Object.freeze({ id: 'roots', label: 'Roots — 1970s–1980s' }),
    Object.freeze({ id: 'y2k', label: 'Y2K Radio — 1990s–2000s' }),
    Object.freeze({ id: 'new-era', label: 'New Era — 2015–Now' }),
]);

export const RADIO_SHADOW_LIMITS = Object.freeze({
    length: Object.freeze([.1, 3]),
    offsetX: Object.freeze([-3, 3]),
    depthOffset: Object.freeze([-1, 1]),
});

export const RADIO_SHADOW_DEFAULTS = Object.freeze({ custom: false, length: .55, offsetX: 0, depthOffset: 0 });

const targetIds = new Set(RADIO_SHADOW_TARGETS.map(target => target.id));
const fields = new Set(['custom', ...Object.keys(RADIO_SHADOW_LIMITS)]);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function normalizeProfile(raw) {
    const profile = object(raw);
    const normalized = { custom: profile.custom === true };
    for (const [key, [min, max]] of Object.entries(RADIO_SHADOW_LIMITS)) {
        normalized[key] = typeof profile[key] === 'number' && Number.isFinite(profile[key])
            ? Math.max(min, Math.min(max, profile[key])) : RADIO_SHADOW_DEFAULTS[key];
    }
    return normalized;
}

/** Runtime input is untrusted: ignore unknown targets and clamp known numeric fields. */
export function normalizeRadioShadowProfiles(raw) {
    const profiles = object(raw);
    return Object.fromEntries(RADIO_SHADOW_TARGETS.map(({ id }) => [id, normalizeProfile(own(profiles, id) ? profiles[id] : undefined)]));
}

/** Inherited profiles reproduce the original global cast exactly, including its enabled state. */
export function resolveRadioShadow(rawProfiles, target, globalShadows) {
    const settings = normalizeSpriteShadowSettings(globalShadows);
    const profiles = object(rawProfiles);
    const profile = normalizeProfile(targetIds.has(target) && own(profiles, target) ? profiles[target] : undefined);
    return profile.custom
        ? { settings: { ...settings, length: profile.length, depthOffset: profile.depthOffset }, offsetX: profile.offsetX }
        : { settings, offsetX: 0 };
}

/** Owner writes are strict, unlike tolerant public reads. No string coercion or branch deletion. */
export function mergeRadioShadowPatch(previous, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Radio shadow settings must be an object.');
    const merged = { ...object(previous) };
    for (const [target, profile] of Object.entries(patch)) {
        if (!targetIds.has(target)) throw new TypeError(`Unknown Radio shadow target: ${target}.`);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile) || Object.keys(profile).length === 0) {
            throw new TypeError(`Radio shadow profile ${target} must contain settings.`);
        }
        for (const [field, value] of Object.entries(profile)) {
            if (!fields.has(field)) throw new TypeError(`Unknown Radio shadow field: ${field}.`);
            if (field === 'custom') {
                if (typeof value !== 'boolean') throw new TypeError('Radio shadow custom must be a boolean.');
            } else {
                const [min, max] = RADIO_SHADOW_LIMITS[field];
                if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
                    throw new TypeError(`Radio shadow ${field} must be a number between ${min} and ${max}.`);
                }
            }
        }
        merged[target] = { ...normalizeProfile(own(merged, target) ? merged[target] : undefined), ...profile };
    }
    return merged;
}

