export const ATMOSPHERE_MOTES = Object.freeze([
    { x: 12, y: 18, size: 2, depth: 'far', dx: 18, dy: -28, duration: 34, delay: -9 },
    { x: 29, y: 36, size: 3, depth: 'far', dx: -16, dy: -35, duration: 41, delay: -25 },
    { x: 47, y: 13, size: 2, depth: 'far', dx: 22, dy: -18, duration: 38, delay: -18 },
    { x: 71, y: 29, size: 2, depth: 'far', dx: -24, dy: -26, duration: 45, delay: -13 },
    { x: 88, y: 55, size: 3, depth: 'far', dx: -15, dy: -38, duration: 37, delay: -30 },
    { x: 38, y: 65, size: 2, depth: 'far', dx: 14, dy: -24, duration: 43, delay: -19, desktop: true },
    { x: 80, y: 12, size: 2, depth: 'far', dx: -20, dy: -15, duration: 40, delay: -7, desktop: true },
    { x: 9, y: 41, size: 10, depth: 'middle', dx: 40, dy: -58, duration: 29, delay: -11 },
    { x: 64, y: 21, size: 7, depth: 'middle', dx: -30, dy: -46, duration: 32, delay: -22 },
    { x: 83, y: 67, size: 13, depth: 'middle', dx: -38, dy: -54, duration: 36, delay: -17 },
    { x: 43, y: 48, size: 8, depth: 'middle', dx: 24, dy: -43, duration: 31, delay: -6 },
    { x: 25, y: 27, size: 11, depth: 'middle', dx: 36, dy: -50, duration: 34, delay: -27, desktop: true },
    { x: 76, y: 43, size: 9, depth: 'middle', dx: -28, dy: -48, duration: 30, delay: -14, desktop: true },
    { x: 3, y: 34, size: 76, depth: 'near', dx: 48, dy: -75, duration: 25, delay: -10 },
    { x: 86, y: 58, size: 106, depth: 'near', dx: -54, dy: -82, duration: 28, delay: -19 },
    { x: 38, y: 53, size: 54, depth: 'near', dx: -34, dy: -65, duration: 27, delay: -4 },
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
