import { dispatchFilmTransition, dispatchFilmTransitionEnd } from './filmLeak.js';

export function createSceneMotionTracker({
    now = () => performance.now(),
    start = detail => dispatchFilmTransition(detail),
    end = id => dispatchFilmTransitionEnd(id),
} = {}) {
    let sequence = 0;
    let active = 0;
    let startedAt = 0;
    let samples = 0;
    let stable = 0;
    const previous = new Float64Array(8);
    const values = new Float64Array(8);
    return {
        begin(source = 'navigation') {
            active = ++sequence;
            startedAt = now();
            samples = stable = 0;
            start({ managed: true, id: active, startedAt, source });
            return active;
        },
        sample(pos, look, fov, itemOffset = 0) {
            if (!active) return false;
            values[0] = pos.x; values[1] = pos.y; values[2] = pos.z;
            values[3] = look.x; values[4] = look.y; values[5] = look.z;
            values[6] = fov; values[7] = itemOffset;
            let settled = samples > 0;
            for (let i = 0; i < 8; i++) {
                const value = Number(values[i]);
                if (!Number.isFinite(value) || Math.abs(value - previous[i]) > (i === 6 ? .002 : .0001)) settled = false;
                previous[i] = value;
            }
            samples++;
            stable = settled ? stable + 1 : 0;
            if ((stable < 3 || now() - startedAt < 64) && now() - startedAt < 7800) return false;
            const id = active;
            active = 0;
            end(id);
            return true;
        },
        cancel() {
            if (!active) return;
            const id = active;
            active = 0;
            end(id);
        },
        snapshot: () => ({ active, samples, stable, startedAt }),
    };
}

const sceneMotion = createSceneMotionTracker();
export function beginSceneMotion(source) {
    if (typeof document !== 'undefined' && (document.getElementById('splash-screen') || document.visibilityState === 'hidden')) return undefined;
    return sceneMotion.begin(source);
}
export const reportSceneMotionPose = (pos, look, fov, itemOffset) => sceneMotion.sample(pos, look, fov, itemOffset);
export const cancelSceneMotion = () => sceneMotion.cancel();
