function boundedProgress(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return 0;
    const number = typeof value === 'string'
        ? Number(value.trim().replace(/%$/, ''))
        : value;
    return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

export const SPLASH_TAG_DURATION = 320;
export const SPLASH_PAINT_DURATION = 420;
export const SPLASH_DRAWING_BUFFER = 24;
const drawings = new WeakMap();

export function splashProgressStages(value) {
    const progress = boundedProgress(value);
    return {
        tag: Math.min(100, progress / 0.35),
        paint: Math.max(0, (progress - 35) / 0.65),
    };
}

export function createSplashDrawing({
    onTag = () => {}, onPaint = () => {},
    initialTag = 0, initialPaint = 0,
    now = () => globalThis.performance?.now?.() ?? Date.now(),
    schedule = setTimeout, cancel = clearTimeout,
    reduced = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
} = {}) {
    let tag = boundedProgress(initialTag);
    let paint = boundedProgress(initialPaint);
    let paintTarget = paint;
    let tagDeadline = tag && !reduced() ? now() + SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER : 0;
    let paintDeadline = paint && !reduced() ? now() + SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER : 0;
    let paintTimer;
    let completionTimer;
    let completion;
    let resolveCompletion;
    let cancelled = false;

    const applyPaint = () => {
        paintTimer = undefined;
        if (cancelled || paintTarget <= paint) return;
        paint = paintTarget;
        onPaint(paint);
        paintDeadline = now() + (reduced() ? 0 : SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER);
    };

    const update = (value) => {
        if (cancelled) return;
        const stages = splashProgressStages(value);
        const skip = reduced();
        if (stages.tag > tag) {
            tag = stages.tag;
            onTag(tag);
            tagDeadline = now() + (skip ? 0 : SPLASH_TAG_DURATION + SPLASH_DRAWING_BUFFER);
        }
        paintTarget = Math.max(paintTarget, stages.paint);
        cancel(paintTimer);
        paintTimer = undefined;
        if (skip) {
            tagDeadline = 0;
            paintDeadline = 0;
            cancel(completionTimer);
            resolveCompletion?.(true);
        }
        if (paintTarget > paint) {
            const delay = Math.max(0, tagDeadline - now());
            if (delay) paintTimer = schedule(applyPaint, delay);
            else applyPaint();
        }
    };

    return {
        update,
        finish() {
            if (cancelled) return Promise.resolve(false);
            update(100);
            if (completion) return completion;
            const deadline = paintTimer === undefined
                ? paintDeadline
                : Math.max(now(), tagDeadline) + SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER;
            const delay = reduced() ? 0 : Math.max(0, deadline - now());
            if (!delay) return Promise.resolve(true);
            completion = new Promise((resolve) => { resolveCompletion = resolve; });
            completionTimer = schedule(() => {
                completionTimer = undefined;
                resolveCompletion(!cancelled);
            }, Math.min(SPLASH_TAG_DURATION + SPLASH_PAINT_DURATION + SPLASH_DRAWING_BUFFER * 2, delay));
            return completion;
        },
        cancel() {
            cancelled = true;
            cancel(paintTimer);
            cancel(completionTimer);
            resolveCompletion?.(false);
        },
    };
}

function splashUnavailable(doc) {
    const screen = doc?.getElementById('splash-screen');
    return Boolean(screen?.classList?.contains('hidden') || screen?.classList?.contains('failed'));
}

function drawingFor(stamp, runtime) {
    let drawing = drawings.get(stamp);
    if (!drawing) {
        drawing = createSplashDrawing({
            ...runtime,
            initialTag: stamp.style.getPropertyValue('--splash-tag-progress'),
            initialPaint: stamp.style.getPropertyValue('--splash-paint-progress'),
            onTag: (value) => stamp.style.setProperty('--splash-tag-progress', `${value}%`),
            onPaint: (value) => stamp.style.setProperty('--splash-paint-progress', `${value}%`),
        });
        drawings.set(stamp, drawing);
    }
    return drawing;
}

export function updateSplashProgress(value, doc = globalThis.document, runtime) {
    const progress = doc?.getElementById('splash-progress');
    if (!progress) return;
    const stamp = doc.getElementById('splash-stamp');

    const next = Math.max(
        boundedProgress(value),
        boundedProgress(progress.style.getPropertyValue('--splash-progress')),
        boundedProgress(progress.getAttribute('aria-valuenow')),
        boundedProgress(stamp?.style.getPropertyValue('--splash-progress')),
    );
    progress.style.setProperty('--splash-progress', `${next}%`);
    stamp?.style.setProperty('--splash-progress', `${next}%`);
    progress.setAttribute('aria-valuenow', String(next));
    if (stamp && !splashUnavailable(doc)) drawingFor(stamp, runtime).update(next);
    return next;
}

export function completeSplashDrawing(doc = globalThis.document, runtime) {
    if (splashUnavailable(doc)) {
        cancelSplashDrawing(doc);
        return Promise.resolve(false);
    }
    if (updateSplashProgress(100, doc, runtime) === undefined) return Promise.resolve(false);
    const stamp = doc.getElementById('splash-stamp');
    return stamp ? drawingFor(stamp, runtime).finish() : Promise.resolve(true);
}

export function cancelSplashDrawing(doc = globalThis.document) {
    const stamp = doc?.getElementById('splash-stamp');
    if (!stamp) return;
    drawings.get(stamp)?.cancel();
    drawings.delete(stamp);
}
