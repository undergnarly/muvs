import { normalizeVisualEffects, VISUAL_EFFECTS_DEFAULTS } from './visualEffects.js';

export const FILM_TRANSITION_EVENT = 'muvs:scene-transition';
export const FILM_TRANSITION_END_EVENT = 'muvs:scene-transition-end';
export const FILM_LEAK_CLIPS = Object.freeze(['a', 'b', 'c', 'd'].map((name) => `/videos/atmosphere/film-leak-${name}-v1.mp4`));
export const FILM_DUST_CLIPS = Object.freeze(['a', 'b', 'c', 'd'].map((name) => `/videos/atmosphere/film-dust-${name}-v1.mp4`));
export const FILM_LEAK_DURATION = 1000;
export const FILM_DUST_DURATION = 2400;
export const FILM_LEAK_COOLDOWN = 1500;
const FILM_MANAGED_MAX_DURATION = 8000;
const FILM_MIN_QUIET = 800;

const unitRandom = (random) => Math.max(0, Math.min(.999999999, Number(random()) || 0));
const filmNow = () => globalThis.performance?.now?.() ?? Date.now();
export const filmLeakIdleDelay = (random = Math.random) => 9000 + Math.floor(unitRandom(random) * 6001);
export const filmDustIdleDelay = (random = Math.random) => 6000 + Math.floor(unitRandom(random) * 1001);
export function filmLeakSeek(duration, random = Math.random, visibleDuration = 1) {
    const visible = Number.isFinite(Number(visibleDuration)) ? Math.max(0, Number(visibleDuration)) : 1;
    return (Number.isFinite(Number(duration)) ? Math.max(0, Number(duration) - visible - .1) : 0) * unitRandom(random);
}

export function filmLeakPlaybackPlan(sourceDuration, { duration = FILM_LEAK_DURATION, navigation = false, random = Math.random } = {}) {
    const loop = navigation || duration / 1000 + .1 > sourceDuration;
    return { loop, time: loop ? 0 : filmLeakSeek(sourceDuration, random, duration / 1000) };
}

const visibleEffect = effect => effect.enabled && effect.opacity > 0;
const configuredIdleDelay = (effect, random) => {
    const min = Math.round(effect.intervalMinSeconds * 1000);
    const max = Math.round(effect.intervalMaxSeconds * 1000);
    return min + Math.floor(unitRandom(random) * (max - min + 1));
};

let pendingTransition;
let transitionSerial = 0;

export function dispatchFilmTransition(detail, target = globalThis.window, { now = filmNow } = {}) {
    if (!target?.dispatchEvent || !target.CustomEvent) return;
    pendingTransition = { serial: ++transitionSerial, at: now(), detail, target };
    target.dispatchEvent(new target.CustomEvent(FILM_TRANSITION_EVENT, { detail }));
}

export function dispatchFilmTransitionEnd(id, target = globalThis.window) {
    if (pendingTransition?.target === target && pendingTransition.detail?.managed
        && pendingTransition.detail.id === id) pendingTransition = undefined;
    if (!target?.dispatchEvent || !target.CustomEvent) return;
    target.dispatchEvent(new target.CustomEvent(FILM_TRANSITION_END_EVENT, { detail: { id } }));
}

// One bounded handoff bridges a route event that precedes the lazy scene mount.
// An already-mounted listener consumes it synchronously, including while blocked.
export function takeFilmTransition({ target = globalThis.window, now = filmNow, maxAge = 2000 } = {}) {
    if (!pendingTransition) return undefined;
    const age = now() - pendingTransition.at;
    if (!Number.isFinite(age) || age < 0 || age > Math.max(0, Number(maxAge) || 0)) {
        pendingTransition = undefined;
        return undefined;
    }
    if (pendingTransition.target !== target) return undefined;
    const { serial, at, detail } = pendingTransition;
    pendingTransition = undefined;
    return { serial, at, detail };
}

export const consumeFilmTransition = (options) => Boolean(takeFilmTransition(options));

// Both families share one player and one earliest-deadline timer. Dust keeps a
// start-to-start cadence; navigation only restarts the quieter light-leak idle.
// Accepted navigation preempts idle media; an active navigation pulse coalesces
// further input instead of queuing flashes or competing for the shared decoder.
export function createFilmLeakController({
    play, warm = () => {}, stop = () => {}, random = Math.random,
    now = filmNow, setTimer = setTimeout, clearTimer = clearTimeout,
    clips = FILM_LEAK_CLIPS, dustClips = FILM_DUST_CLIPS, settings,
} = {}) {
    const effects = normalizeVisualEffects(settings);
    const transitionOn = visibleEffect(effects.transition) && clips.length > 0;
    const lightOn = visibleEffect(effects.lightLeaks) && clips.length > 0;
    const dustOn = visibleEffect(effects.filmDust) && dustClips.length > 0;
    const lightDelay = () => configuredIdleDelay(effects.lightLeaks, random);
    const dustDelay = () => configuredIdleDelay(effects.filmDust, random);
    // Managed transitions follow real camera motion. Preserve the existing
    // non-3D/library 1s baseline and scale it by the same configured ratio.
    const transitionDuration = Math.round(FILM_LEAK_DURATION
        * effects.transition.durationSeconds / VISUAL_EFFECTS_DEFAULTS.transition.durationSeconds);
    let mode = 'waiting';
    let idleTimer;
    let active = false;
    let activeKind;
    let disposed = false;
    let generation = 0;
    let cancellation;
    let managed;
    let previousLeak = -1;
    let previousDust = -1;
    let lastStart = -Infinity;
    let lastTransitionStart = -Infinity;
    let lastEnd = -Infinity;
    let leakDue = Infinity;
    let dustDue = Infinity;
    let route;
    let routeSeeded = false;
    let gestureAt = -Infinity;
    let gestureX = 0;
    let gestureY = 0;

    const clearIdle = () => {
        if (idleTimer !== undefined) clearTimer(idleTimer);
        idleTimer = undefined;
    };
    const resetGesture = () => { gestureAt = -Infinity; gestureX = gestureY = 0; };
    const finishManaged = (record = managed) => {
        if (!record) return;
        if (record.timer !== undefined) clearTimer(record.timer);
        record.timer = undefined;
        if (record.ended) return;
        record.ended = true;
        record.resolve();
        record.motion.abort();
    };
    const abortActive = () => {
        generation++;
        const previous = cancellation;
        cancellation = undefined;
        finishManaged();
        managed = undefined;
        if (active) lastEnd = now();
        active = false;
        activeKind = undefined;
        previous?.abort();
    };
    const scheduleIdle = () => {
        clearIdle();
        if (disposed || mode !== 'running' || active) return;
        const deadline = Math.min(leakDue, dustDue);
        if (!Number.isFinite(deadline)) return;
        const next = Math.max(deadline, lastStart + FILM_LEAK_COOLDOWN, lastEnd + FILM_MIN_QUIET);
        idleTimer = setTimer(() => {
            idleTimer = undefined;
            if (!trigger(dustDue <= leakDue ? 'dust' : 'idle')) scheduleIdle();
        }, Math.max(0, next - now()));
    };
    const cancel = () => {
        clearIdle();
        abortActive();
        leakDue = dustDue = Infinity;
        resetGesture();
        stop(mode);
    };
    const trigger = (kind = 'transition') => {
        const stamp = now();
        const dust = kind === 'dust';
        const navigation = kind === 'transition' || kind === 'gesture';
        const family = dust ? dustClips : clips;
        const effect = navigation ? effects.transition : dust ? effects.filmDust : effects.lightLeaks;
        const enabled = navigation ? transitionOn : dust ? dustOn : lightOn;
        if (disposed || mode !== 'running' || !enabled) return false;
        if (navigation) {
            if (stamp - lastTransitionStart < FILM_LEAK_COOLDOWN
                || (active && (managed || activeKind === 'transition' || activeKind === 'gesture'))) return false;
            lastTransitionStart = stamp;
            if (active) {
                // The media abort listener hides and pauses synchronously. Its
                // old async finally is invalid before another play can start.
                abortActive();
                if (disposed || mode !== 'running') return false;
            }
        } else if (active || stamp - lastStart < FILM_LEAK_COOLDOWN
            || stamp - lastEnd < FILM_MIN_QUIET) return false;
        clearIdle();
        lastStart = stamp;
        if (dust) dustDue = stamp + dustDelay();
        else leakDue = Infinity;
        active = true;
        activeKind = kind;
        const token = ++generation;
        cancellation = new AbortController();
        let index = Math.floor(unitRandom(random) * family.length);
        if (index === (dust ? previousDust : previousLeak) && family.length > 1) index = (index + 1) % family.length;
        if (dust) previousDust = index; else previousLeak = index;
        const signal = cancellation.signal;
        Promise.resolve().then(() => {
            if (signal.aborted) return;
            return play?.({
                signal, clip: family[index], variant: dust ? 'dust' : 'leak',
                duration: navigation ? transitionDuration : Math.round(effect.durationSeconds * 1000),
                opacity: effect.opacity, fadeOutMs: effects.transition.fadeOutMs, kind, random,
            });
        }).catch(() => {
            // A decorative media failure must never become a navigation error.
        }).finally(() => {
            if (disposed || generation !== token) return;
            active = false;
            activeKind = undefined;
            cancellation = undefined;
            lastEnd = now();
            if (!dust) leakDue = lightOn ? lastEnd + lightDelay() : Infinity;
            scheduleIdle();
        });
        return true;
    };
    const endTransition = (id) => {
        if (disposed || !active || !managed || managed.id !== id || managed.ended) return false;
        finishManaged();
        return true;
    };
    const armManaged = (record) => {
        if (record.timer !== undefined) clearTimer(record.timer);
        record.timer = setTimer(() => {
            record.timer = undefined;
            if (managed === record) endTransition(record.id);
        }, Math.max(0, record.startedAt + FILM_MANAGED_MAX_DURATION - now()));
    };
    const beginTransition = (detail) => {
        const stamp = now();
        if (disposed || mode !== 'running' || !transitionOn || !detail?.managed
            || detail.id === undefined || detail.id === null) return false;
        const startedAt = Number.isFinite(detail.startedAt) ? Math.min(stamp, detail.startedAt) : stamp;
        if (stamp - startedAt >= FILM_MANAGED_MAX_DURATION) return false;
        // Accepted camera retargets already carry navigation intent. They do
        // not inherit raw-gesture cooldowns and keep the current clip/hold.
        if (active && managed && !managed.ended) {
            managed.id = detail.id;
            managed.startedAt = startedAt;
            lastTransitionStart = stamp;
            armManaged(managed);
            return true;
        }
        clearIdle();
        if (active) abortActive();
        if (disposed || mode !== 'running') return false;
        lastStart = lastTransitionStart = stamp;
        leakDue = Infinity;
        active = true;
        activeKind = 'managed';
        const token = ++generation;
        cancellation = new AbortController();
        let index = Math.floor(unitRandom(random) * clips.length);
        if (index === previousLeak && clips.length > 1) index = (index + 1) % clips.length;
        previousLeak = index;
        const record = { id: detail.id, startedAt, motion: new AbortController(), ended: false, timer: undefined };
        const ended = new Promise(resolve => { record.resolve = resolve; });
        managed = record;
        armManaged(record);
        const payload = {
            signal: cancellation.signal, clip: clips[index], variant: 'leak',
            kind: 'transition', duration: transitionDuration, random,
            managed: true, opacity: effects.transition.opacity, fadeOutMs: effects.transition.fadeOutMs,
            startedAt, ended, motionSignal: record.motion.signal,
        };
        let operation;
        // Synchronous entry lets the component show its prepared CSS/poster
        // underlay on the accepted input, independently of video readiness.
        try { operation = play?.(payload); } catch { /* decorative failure */ }
        Promise.resolve(operation).catch(() => {
            // Failed media cannot turn into late navigation or queued flashes.
        }).finally(() => {
            if (disposed || generation !== token) return;
            finishManaged(record);
            managed = undefined;
            active = false;
            activeKind = undefined;
            cancellation = undefined;
            lastEnd = now();
            leakDue = lightOn ? lastEnd + lightDelay() : Infinity;
            scheduleIdle();
        });
        return true;
    };
    return {
        setMode(nextMode) {
            if (disposed || mode === nextMode) return;
            mode = nextMode;
            if (mode !== 'running') { cancel(); return; }
            resetGesture();
            const stamp = now();
            leakDue = lightOn ? stamp + lightDelay() : Infinity;
            dustDue = dustOn ? stamp + dustDelay() : Infinity;
            const warmClip = transitionOn || lightOn ? clips[0] : dustOn ? dustClips[0] : undefined;
            try { if (warmClip) Promise.resolve(warm(warmClip)).catch(() => {}); } catch { /* optional warmup */ }
            scheduleIdle();
        },
        beginTransition,
        endTransition,
        trigger,
        routeChanged(nextRoute) {
            if (!routeSeeded) { routeSeeded = true; route = nextRoute; return false; }
            if (route === nextRoute) return false;
            route = nextRoute;
            return trigger('transition');
        },
        gesture(x, y) {
            if (disposed || mode !== 'running') { resetGesture(); return false; }
            const stamp = now();
            if (stamp - gestureAt > 200) gestureX = gestureY = 0;
            gestureAt = stamp;
            gestureX += Number.isFinite(x) ? x : 0;
            gestureY += Number.isFinite(y) ? y : 0;
            if (Math.hypot(gestureX, gestureY) < .12) return false;
            gestureX = gestureY = 0;
            return trigger('gesture');
        },
        dispose() { if (disposed) return; disposed = true; cancel(); },
        snapshot: () => ({ mode, active, disposed, idleScheduled: idleTimer !== undefined }),
    };
}

export function filmAbortError() {
    const error = new Error('Film effect cancelled');
    error.name = 'AbortError';
    return error;
}

// A stalled native play promise and an unseekable/failed clip both have a bound.
// Aborting detaches every listener/timer even if the browser promise never settles.
export function filmDeadline(promise, { signal, timeout = 1200, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    return new Promise((resolve, reject) => {
        let timer;
        let finished = false;
        const finish = (error, value) => {
            if (finished) return;
            finished = true;
            clearTimer(timer);
            signal?.removeEventListener('abort', abort);
            if (error) reject(error); else resolve(value);
        };
        const abort = () => finish(filmAbortError());
        if (signal?.aborted) { abort(); return; }
        signal?.addEventListener('abort', abort, { once: true });
        timer = setTimer(() => finish(new Error('Film media readiness timed out')), timeout);
        Promise.resolve(promise).then(value => finish(null, value), error => finish(error));
    });
}

export function waitForFilmMedia(video, test, events, { signal, timeout = 1400 } = {}) {
    if (signal?.aborted) return Promise.reject(filmAbortError());
    if (test()) return Promise.resolve();
    let cleanup = () => {};
    const ready = new Promise((resolve, reject) => {
        const check = () => { if (test()) resolve(); };
        const fail = () => reject(new Error('Film clip unavailable'));
        cleanup = () => {
            for (const event of events) video.removeEventListener(event, check);
            video.removeEventListener('error', fail);
        };
        for (const event of events) video.addEventListener(event, check);
        video.addEventListener('error', fail, { once: true });
        check();
    });
    return filmDeadline(ready, { signal, timeout }).finally(cleanup);
}
