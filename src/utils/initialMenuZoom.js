export function createInitialMenuZoom({ enabled, initialIndex }) {
    let elapsed = 0;
    let complete = !enabled;
    return {
        sample({ delta, ready, visible, skip, menu, index }) {
            if (skip || !menu || index !== initialIndex) complete = true;
            if (complete) return 1;
            if (ready && visible) elapsed = Math.min(1, elapsed + Math.max(0, Math.min(0.05, delta || 0)));
            if (elapsed >= 1) complete = true;
            return 1 + 0.2 * Math.pow(1 - elapsed, 3);
        },
    };
}
