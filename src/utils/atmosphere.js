export const ATMOSPHERE_MOTES = Object.freeze([
    { x: 12, size: 16, depth: 'far', dx: 10, duration: 224, delay: -51 },
    { x: 29, size: 20, depth: 'far', dx: -12, duration: 246, delay: -173 },
    { x: 47, size: 14, depth: 'far', dx: 14, duration: 216, delay: -111 },
    { x: 71, size: 18, depth: 'far', dx: -9, duration: 232, delay: -76 },
    { x: 88, size: 22, depth: 'far', dx: -14, duration: 220, delay: -194 },
    { x: 38, size: 18, depth: 'far', dx: 12, duration: 240, delay: -123, desktop: true },
    { x: 80, size: 16, depth: 'far', dx: -10, duration: 228, delay: -38, desktop: true },
    { x: 9, size: 36, depth: 'middle', dx: 25, duration: 122, delay: -41 },
    { x: 64, size: 30, depth: 'middle', dx: -20, duration: 138, delay: -98 },
    { x: 83, size: 42, depth: 'middle', dx: -26, duration: 130, delay: -72 },
    { x: 43, size: 32, depth: 'middle', dx: 22, duration: 114, delay: -24 },
    { x: 25, size: 38, depth: 'middle', dx: 24, duration: 134, delay: -115, desktop: true },
    { x: 76, size: 34, depth: 'middle', dx: -20, duration: 124, delay: -56, desktop: true },
    { x: 3, size: 74, depth: 'near', dx: 30, duration: 46, delay: -19 },
    { x: 86, size: 92, depth: 'near', dx: -32, duration: 52, delay: -38 },
    { x: 38, size: 62, depth: 'near', dx: -26, duration: 42, delay: -9 },
]);

export function atmosphereMotionMode({ hidden = false, reduced = false, saveData = false, loading = false, paused = false } = {}) {
    if (reduced || saveData) return 'still';
    if (hidden || paused) return 'paused';
    return loading ? 'waiting' : 'running';
}

export function observeAtmosphereMotion(onChange, {
    doc = document, win = window, connection = navigator.connection, paused = false,
} = {}) {
    const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    let observer;
    let previous;
    const update = () => {
        const loading = Boolean(doc.getElementById('splash-screen'));
        const mode = atmosphereMotionMode({
            hidden: doc.visibilityState === 'hidden', reduced: preference?.matches,
            saveData: connection?.saveData, loading, paused,
        });
        if (!loading) observer?.disconnect();
        if (mode !== previous) { previous = mode; onChange(mode); }
    };
    if (doc.getElementById('splash-screen') && win.MutationObserver) {
        observer = new win.MutationObserver(update);
        observer.observe(doc.body, { childList: true });
    }
    doc.addEventListener('visibilitychange', update);
    preference?.addEventListener?.('change', update);
    connection?.addEventListener?.('change', update);
    update();
    return () => {
        observer?.disconnect();
        doc.removeEventListener('visibilitychange', update);
        preference?.removeEventListener?.('change', update);
        connection?.removeEventListener?.('change', update);
    };
}
