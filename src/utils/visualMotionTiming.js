import { VISUAL_EFFECTS_DEFAULTS, VISUAL_EFFECTS_LIMITS } from './visualEffects.js';

const DEFAULT_DURATION = VISUAL_EFFECTS_DEFAULTS.transition.durationSeconds;
const [MIN_DURATION, MAX_DURATION] = VISUAL_EFFECTS_LIMITS.transition.durationSeconds;

export function sceneTransitionDuration(value) {
    return Number.isFinite(value) ? Math.max(MIN_DURATION, Math.min(MAX_DURATION, value)) : DEFAULT_DURATION;
}

export function sceneMotionDelta(delta) {
    return Number.isFinite(delta) && delta >= 0 && delta <= .25 ? delta : 0;
}

export function sceneDampingAlpha(delta, duration = DEFAULT_DURATION, span = 1, epsilon = .0005) {
    const step = sceneMotionDelta(delta);
    if (!step) return 0;
    const distance = Number.isFinite(span) && span > 0 ? span : 1;
    const tolerance = Number.isFinite(epsilon) && epsilon > 0 && epsilon < distance ? epsilon : distance * .0005;
    return -Math.expm1(Math.log(tolerance / distance) * step / sceneTransitionDuration(duration));
}
