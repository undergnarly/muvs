function boundedProgress(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return 0;
    const number = typeof value === 'string'
        ? Number(value.trim().replace(/%$/, ''))
        : value;
    return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0;
}

export function updateSplashProgress(value, doc = globalThis.document) {
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
    return next;
}
