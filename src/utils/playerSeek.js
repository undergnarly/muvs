export function keyboardSeek(key, progress, duration) {
    if (!Number.isFinite(duration) || duration <= 0) return null;
    const step = key === 'PageUp' || key === 'PageDown' ? 10 : 5;
    if (key === 'Home') return 0;
    if (key === 'End') return 1;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(key)) return null;
    const direction = ['ArrowLeft', 'ArrowDown', 'PageDown'].includes(key) ? -1 : 1;
    return Math.max(0, Math.min(1, progress + direction * step / duration));
}
