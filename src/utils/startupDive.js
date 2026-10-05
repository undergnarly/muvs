export const STARTUP_DIVE_DURATION = 1350;
export const STARTUP_DIVE_HOLD = 100;

export function startupDiveEase(value) {
    const t = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

export function createStartupDive({
    request = requestAnimationFrame, cancel = cancelAnimationFrame,
    visible = () => document.visibilityState !== 'hidden',
    skip = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData),
    onStart = () => {}, onProgress = () => {}, onFinish = () => {},
} = {}) {
    let elapsed = 0;
    let previous;
    let paintFrames = 0;
    let started = false;
    let stopped = false;
    let frame;
    let resolve;
    const finished = new Promise((done) => { resolve = done; });
    const finish = (success) => {
        if (stopped) return;
        stopped = true;
        cancel(frame);
        if (success) { onProgress(1); onFinish(); }
        resolve(success);
    };
    const tick = (time) => {
        if (stopped) return;
        if (!visible()) {
            previous = undefined;
            frame = request(tick);
            return;
        }
        const delta = previous === undefined ? 0 : Math.max(0, Math.min(50, time - previous));
        previous = time;
        if (paintFrames < 2) {
            paintFrames++;
        } else {
            elapsed += delta;
            if (elapsed >= STARTUP_DIVE_HOLD) {
                if (!started) { started = true; onStart(); }
                if (skip()) { finish(true); return; }
                const progress = Math.min(1, (elapsed - STARTUP_DIVE_HOLD) / STARTUP_DIVE_DURATION);
                onProgress(startupDiveEase(progress));
                if (progress >= 1) { finish(true); return; }
            }
        }
        frame = request(tick);
    };
    frame = request(tick);
    return { finished, cancel: () => finish(false) };
}

let progress = typeof document !== 'undefined' && document.getElementById('splash-screen') ? 0 : 1;
const reducedMotion = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
export const getStartupDiveProgress = () => (
    reducedMotion?.matches || (typeof navigator !== 'undefined' && navigator.connection?.saveData) ? 1 : progress
);
export const finishStartupDive = () => { progress = 1; };

export function departSplash(screen, onStart) {
    const plane = screen.querySelector('#splash-plane');
    const content = screen.querySelector('#splash-content');
    return createStartupDive({
        onStart: () => {
            plane?.style.setProperty('will-change', 'opacity');
            content?.style.setProperty('will-change', 'transform');
            screen.classList.add('departing');
            onStart?.();
        },
        onProgress: (value) => {
            progress = value;
            plane?.style.setProperty('opacity', String(1 - value));
            content?.style.setProperty('transform', `translate3d(0,${-100 * value}vh,0)`);
        },
        onFinish: () => {
            screen.classList.add('hidden');
            screen.remove();
        },
    });
}

export function guardStartupInput(doc = document) {
    const root = doc.getElementById('root');
    const previousInert = root?.inert;
    if (root) root.inert = true;
    const events = ['wheel', 'touchstart', 'touchmove', 'touchend', 'keydown', 'click'];
    const block = (event) => {
        const splash = doc.getElementById('splash-screen');
        if (!splash || splash.classList.contains('failed') || event.target?.closest?.('#splash-retry')) return;
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
    };
    events.forEach((type) => doc.addEventListener(type, block, { capture: true, passive: false }));
    return () => {
        events.forEach((type) => doc.removeEventListener(type, block, true));
        if (root) root.inert = previousInert;
    };
}
