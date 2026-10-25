import { normalizeSpriteShadowSettings } from './spriteShadow.js';
import { upgradeRadioShadowProfiles } from './radioShadowLegacy.js';

export { upgradeRadioShadowProfiles } from './radioShadowLegacy.js';

export const RADIO_SHADOW_TARGETS = Object.freeze([
    Object.freeze({ id: 'all', label: 'Весь раздел Radio — меню и станции' }),
    Object.freeze({ id: 'menu', label: 'Главное меню — Radio' }),
    Object.freeze({ id: 'roots', label: 'Roots — 1970s–1980s' }),
    Object.freeze({ id: 'y2k', label: 'Y2K Radio — 1990s–2000s' }),
    Object.freeze({ id: 'new-era', label: 'New Era — 2015–Now' }),
]);

// Radio-only bounds: ordinary scene objects keep the original global ranges.
export const RADIO_SHADOW_LIMITS = Object.freeze({
    opacity: Object.freeze([0, 1]),
    directionDegrees: Object.freeze([0, 360]),
    length: Object.freeze([.1, 6]),
    blur: Object.freeze([0, 1]),
    offsetX: Object.freeze([-6, 6]),
    depthOffset: Object.freeze([-5, 5]),
});

export const RADIO_SHADOW_DEFAULTS = Object.freeze({
    custom: false, ...normalizeSpriteShadowSettings(), offsetX: 0,
});

const targetIds = new Set(RADIO_SHADOW_TARGETS.map(target => target.id));
const booleanFields = new Set(['custom', 'enabled']);
const fields = new Set([...booleanFields, ...Object.keys(RADIO_SHADOW_LIMITS)]);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function normalizeProfile(raw, parent) {
    const profile = object(raw);
    const custom = profile.custom === true;
    const normalized = { ...parent, custom };
    if (!custom) return normalized;
    normalized.enabled = typeof profile.enabled === 'boolean' ? profile.enabled : parent.enabled;
    for (const [key, [min, max]] of Object.entries(RADIO_SHADOW_LIMITS)) {
        normalized[key] = typeof profile[key] === 'number' && Number.isFinite(profile[key])
            ? Math.max(min, Math.min(max, profile[key])) : parent[key];
    }
    return normalized;
}

/** Public/editor reads inherit global → section → receiver; missing legacy fields stay inherited. */
export function normalizeRadioShadowProfiles(raw, globalShadows) {
    const profiles = upgradeRadioShadowProfiles(raw);
    const parent = { custom: false, ...normalizeSpriteShadowSettings(globalShadows), offsetX: 0 };
    const section = normalizeProfile(own(profiles, 'all') ? profiles.all : undefined, parent);
    return Object.fromEntries(RADIO_SHADOW_TARGETS.map(({ id }) => [
        id, id === 'all' ? section : normalizeProfile(own(profiles, id) ? profiles[id] : undefined, section),
    ]));
}

/** Unknown/non-Radio targets must never receive Radio defaults or its wider renderer limits. */
export function resolveRadioShadow(rawProfiles, target, globalShadows) {
    if (!targetIds.has(target)) return { settings: normalizeSpriteShadowSettings(globalShadows), offsetX: 0 };
    const { custom: _custom, offsetX, ...settings } = normalizeRadioShadowProfiles(rawProfiles, globalShadows)[target];
    return { settings, offsetX, limits: RADIO_SHADOW_LIMITS };
}

/** Owner writes are strict partial patches; do not materialize inherited defaults into legacy data. */
export function mergeRadioShadowPatch(previous, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Radio shadow settings must be an object.');
    const merged = upgradeRadioShadowProfiles(previous);
    // An explicit marker distinguishes a new per-menu preset from legacy menu-only data.
    if (Object.keys(patch).length > 0 && !own(merged, 'all')) merged.all = { custom: false };
    for (const [target, profile] of Object.entries(patch)) {
        if (!targetIds.has(target)) throw new TypeError(`Unknown Radio shadow target: ${target}.`);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile) || Object.keys(profile).length === 0) {
            throw new TypeError(`Radio shadow profile ${target} must contain settings.`);
        }
        for (const [field, value] of Object.entries(profile)) {
            if (!fields.has(field)) throw new TypeError(`Unknown Radio shadow field: ${field}.`);
            if (booleanFields.has(field)) {
                if (typeof value !== 'boolean') throw new TypeError(`Radio shadow ${field} must be a boolean.`);
            } else {
                const [min, max] = RADIO_SHADOW_LIMITS[field];
                if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
                    throw new TypeError(`Radio shadow ${field} must be a number between ${min} and ${max}.`);
                }
            }
        }
        merged[target] = { ...object(own(merged, target) ? merged[target] : undefined), ...profile };
    }
    return merged;
}

