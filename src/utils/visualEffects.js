export const VISUAL_EFFECTS_DEFAULTS = Object.freeze({
    transition: Object.freeze({ enabled: true, durationSeconds: .6, effectDurationSeconds: 0, opacity: .7, fadeOutMs: 100 }),
    lightLeaks: Object.freeze({ enabled: true, durationSeconds: 1, opacity: .32, intervalMinSeconds: 9, intervalMaxSeconds: 15 }),
    filmDust: Object.freeze({ enabled: true, durationSeconds: 2.4, opacity: .5, intervalMinSeconds: 6, intervalMaxSeconds: 7 }),
    handheld: Object.freeze({ enabled: true, strength: 1, speed: 1 }),
    shadows: Object.freeze({ enabled: true, opacity: .26, directionDegrees: 143, length: .55, blur: .5 }),
});

export const VISUAL_EFFECTS_LIMITS = Object.freeze({
    transition: { durationSeconds: [.2, 3], effectDurationSeconds: [0, 5], opacity: [0, 1], fadeOutMs: [0, 500] },
    lightLeaks: { durationSeconds: [.2, 3], opacity: [0, 1], intervalMinSeconds: [3, 120], intervalMaxSeconds: [3, 120] },
    filmDust: { durationSeconds: [.2, 4], opacity: [0, 1], intervalMinSeconds: [3, 120], intervalMaxSeconds: [3, 120] },
    handheld: { strength: [0, 6], speed: [.25, 3] },
    shadows: { opacity: [0, 1], directionDegrees: [0, 360], length: [.1, 3], blur: [0, 1] },
});

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export function normalizeVisualEffects(input) {
    const source = object(input);
    const output = {};
    for (const [group, defaults] of Object.entries(VISUAL_EFFECTS_DEFAULTS)) {
        const values = object(source[group]);
        const next = { enabled: typeof values.enabled === 'boolean' ? values.enabled : defaults.enabled };
        for (const [key, [min, max]] of Object.entries(VISUAL_EFFECTS_LIMITS[group])) {
            const raw = values[key];
            const number = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
            next[key] = Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : defaults[key];
        }
        if ('intervalMinSeconds' in next && next.intervalMinSeconds > next.intervalMaxSeconds) {
            [next.intervalMinSeconds, next.intervalMaxSeconds] = [next.intervalMaxSeconds, next.intervalMinSeconds];
        }
        output[group] = next;
    }
    return output;
}
