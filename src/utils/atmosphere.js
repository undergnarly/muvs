export const ATMOSPHERE_MOTES = Object.freeze([
    { x: 12, size: 16, depth: 'far', dx: 10, duration: 172, delay: -39 },
    { x: 29, size: 20, depth: 'far', dx: -12, duration: 186, delay: -131 },
    { x: 47, size: 14, depth: 'far', dx: 14, duration: 162, delay: -83 },
    { x: 71, size: 18, depth: 'far', dx: -9, duration: 178, delay: -58 },
    { x: 88, size: 22, depth: 'far', dx: -14, duration: 168, delay: -148 },
    { x: 38, size: 18, depth: 'far', dx: 12, duration: 183, delay: -94, desktop: true },
    { x: 80, size: 16, depth: 'far', dx: -10, duration: 176, delay: -29, desktop: true },
    { x: 9, size: 36, depth: 'middle', dx: 25, duration: 116, delay: -39 },
    { x: 64, size: 30, depth: 'middle', dx: -20, duration: 128, delay: -91 },
    { x: 83, size: 42, depth: 'middle', dx: -26, duration: 121, delay: -67 },
    { x: 43, size: 32, depth: 'middle', dx: 22, duration: 112, delay: -24 },
    { x: 25, size: 38, depth: 'middle', dx: 24, duration: 125, delay: -107, desktop: true },
    { x: 76, size: 34, depth: 'middle', dx: -20, duration: 118, delay: -53, desktop: true },
    { x: 3, size: 74, depth: 'near', dx: 30, duration: 79, delay: -33 },
    { x: 86, size: 92, depth: 'near', dx: -32, duration: 88, delay: -64 },
    { x: 38, size: 62, depth: 'near', dx: -26, duration: 74, delay: -15 },
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
