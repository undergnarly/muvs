export function createInitialMenuZoom({ enabled, initialIndex }) {
    let elapsed = 0;
    let complete = !enabled;
    return {
        sample({ delta, ready, visible, skip, menu, index }) {
            if (skip || !menu || index !== initialIndex) complete = true;
            if (complete) return 1;
            if (ready && visible) elapsed = Math.min(1.25, elapsed + Math.max(0, Math.min(0.05, delta || 0)));
            if (elapsed >= 1.25) complete = true;
            const progress = elapsed / 1.25;
            const eased = progress * progress * (3 - 2 * progress);
            return 1 + 0.2 * (1 - eased);
        },
    };
}

export function applyInitialMenuDolly(position, look, zoom) {
    const amount = Math.max(0, Math.min(1, (zoom - 1) / 0.2));
    if (!amount) return;
    const depth = position.z - look.z;
    position.z = look.z + depth / (1 + 0.2 * amount);
    position.y += Math.abs(depth) * 0.045 * amount;
}
