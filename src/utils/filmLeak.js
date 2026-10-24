export const FILM_TRANSITION_EVENT = 'muvs:scene-transition';
export const FILM_LEAK_CLIPS = Object.freeze(['a', 'b', 'c', 'd'].map((name) => `/videos/atmosphere/film-leak-${name}-v1.mp4`));
export const FILM_DUST_CLIPS = Object.freeze(['a', 'b', 'c', 'd'].map((name) => `/videos/atmosphere/film-dust-${name}-v1.mp4`));
export const FILM_LEAK_DURATION = 1000;
export const FILM_DUST_DURATION = 2400;
export const FILM_LEAK_COOLDOWN = 1500;
const FILM_MIN_QUIET = 800;

const unitRandom = (random) => Math.max(0, Math.min(.999999999, Number(random()) || 0));
const filmNow = () => globalThis.performance?.now?.() ?? Date.now();
export const filmLeakIdleDelay = (random = Math.random) => 9000 + Math.floor(unitRandom(random) * 6001);
export const filmDustIdleDelay = (random = Math.random) => 6000 + Math.floor(unitRandom(random) * 1001);
export function filmLeakSeek(duration, random = Math.random, visibleDuration = 1) {
    const visible = Number.isFinite(Number(visibleDuration)) ? Math.max(0, Number(visibleDuration)) : 1;
    return (Number.isFinite(Number(duration)) ? Math.max(0, Number(duration) - visible - .1) : 0) * unitRandom(random);
}

let pendingTransition;
let transitionSerial = 0;

export function dispatchFilmTransition(detail, target = globalThis.window, { now = filmNow } = {}) {
    if (!target?.dispatchEvent || !target.CustomEvent) return;
    pendingTransition = { serial: ++transitionSerial, at: now(), target };
    target.dispatchEvent(new target.CustomEvent(FILM_TRANSITION_EVENT, { detail }));
}

// One bounded handoff bridges a route event that precedes the lazy scene mount.
// An already-mounted listener consumes it synchronously, including while blocked.
export function consumeFilmTransition({ target = globalThis.window, now = filmNow, maxAge = 2000 } = {}) {
    if (!pendingTransition) return false;
    const age = now() - pendingTransition.at;
    if (!Number.isFinite(age) || age < 0 || age > Math.max(0, Number(maxAge) || 0)) {
        pendingTransition = undefined;
        return false;
    }
    if (pendingTransition.target !== target) return false;
    pendingTransition = undefined;
    return true;
}

// Both families share one player and one earliest-deadline timer. Dust keeps a
// start-to-start cadence; navigation only restarts the quieter light-leak idle.
// Accepted navigation preempts idle media; an active navigation pulse coalesces
// further input instead of queuing flashes or competing for the shared decoder.
export function createFilmLeakController({
    play, warm = () => {}, stop = () => {}, random = Math.random,
    now = filmNow, setTimer = setTimeout, clearTimer = clearTimeout,
    clips = FILM_LEAK_CLIPS, dustClips = FILM_DUST_CLIPS,
} = {}) {
    let mode = 'waiting';
    let idleTimer;
    let active = false;
    let activeKind;
    let disposed = false;
    let generation = 0;
    let cancellation;
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
        generation++;
        cancellation?.abort();
        cancellation = undefined;
        if (active) lastEnd = now();
        active = false;
        activeKind = undefined;
        leakDue = dustDue = Infinity;
        resetGesture();
        stop(mode);
    };
    const trigger = (kind = 'transition') => {
        const stamp = now();
        const dust = kind === 'dust';
        const navigation = kind === 'transition' || kind === 'gesture';
        const family = dust ? dustClips : clips;
        if (disposed || mode !== 'running' || !family.length) return false;
        if (navigation) {
            if (stamp - lastTransitionStart < FILM_LEAK_COOLDOWN
                || (active && (activeKind === 'transition' || activeKind === 'gesture'))) return false;
            lastTransitionStart = stamp;
            if (active) {
                generation++;
                const previous = cancellation;
                cancellation = undefined;
                active = false;
                activeKind = undefined;
                lastEnd = stamp;
                // The media abort listener hides and pauses synchronously. Its
                // old async finally is invalid before another play can start.
                previous?.abort();
                if (disposed || mode !== 'running') return false;
            }
        } else if (active || stamp - lastStart < FILM_LEAK_COOLDOWN
            || stamp - lastEnd < FILM_MIN_QUIET) return false;
        clearIdle();
        lastStart = stamp;
        if (dust) dustDue = stamp + filmDustIdleDelay(random);
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
                duration: dust ? FILM_DUST_DURATION : FILM_LEAK_DURATION,
                opacity: kind === 'idle' ? .32 : .5, kind, random,
            });
        }).catch(() => {
            // A decorative media failure must never become a navigation error.
        }).finally(() => {
            if (disposed || generation !== token) return;
            active = false;
            activeKind = undefined;
            cancellation = undefined;
            lastEnd = now();
            if (!dust && clips.length) leakDue = lastEnd + filmLeakIdleDelay(random);
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
            leakDue = clips.length ? stamp + filmLeakIdleDelay(random) : Infinity;
            dustDue = dustClips.length ? stamp + filmDustIdleDelay(random) : Infinity;
            const warmClip = clips[0] ?? dustClips[0];
            try { if (warmClip) Promise.resolve(warm(warmClip)).catch(() => {}); } catch { /* optional warmup */ }
            scheduleIdle();
        },
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
