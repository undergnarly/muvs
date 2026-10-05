export const MENU_TITLE_STRETCH_DELAY = 0.22;
export const MENU_TITLE_STRETCH_DURATION = 1.6;
export const MENU_TITLE_VIEWPORT_FRACTION = 0.8;

export function createMenuTitleStretch() {
    let previousIndex = -1;
    let elapsed = 0;
    let active = false;
    return {
        index: -1,
        progress: 0,
        visible: true,
        sample({ delta, index, mobile, menu, ready, settled, visible, skip }) {
            this.index = index;
            this.visible = visible;
            if (!mobile || !menu) {
                active = false;
                elapsed = 0;
                this.progress = 0;
                return this.progress;
            }
            if (!active || index !== previousIndex) {
                previousIndex = index;
                elapsed = 0;
                this.progress = 0;
                active = true;
            }
            if (!ready || !visible || !settled) return this.progress;
            if (skip) {
                this.progress = 1;
                return this.progress;
            }
            elapsed = Math.min(MENU_TITLE_STRETCH_DELAY + MENU_TITLE_STRETCH_DURATION,
                elapsed + Math.max(0, Math.min(0.05, delta || 0)));
            const t = Math.max(0, (elapsed - MENU_TITLE_STRETCH_DELAY) / MENU_TITLE_STRETCH_DURATION);
            this.progress = 1 - (1 - t) ** 3;
            return this.progress;
        },
    };
}

export function warpTitleCoordinate(x, center, halfWidth, strength) {
    if (!(halfWidth > 0) || !Number.isFinite(strength)) return x;
    const distance = x - center;
    const normalized = distance / halfWidth;
    return x + strength * distance * normalized * normalized;
}

export function measureTitleGlyphs(bounds, visibleBounds) {
    if (!bounds?.length || bounds.length % 4 || !visibleBounds?.length) return null;
    const width = visibleBounds[2] - visibleBounds[0];
    if (!(width > 0) || !Number.isFinite(width)) return null;
    const center = (visibleBounds[0] + visibleBounds[2]) / 2;
    const halfWidth = width / 2;
    let first = 0;
    let last = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let offset = 0; offset < bounds.length; offset += 4) {
        if (bounds[offset] < minX) { minX = bounds[offset]; first = offset; }
        if (bounds[offset + 2] > maxX) { maxX = bounds[offset + 2]; last = offset; }
    }
    const visibleDisplacement = (x, offset) => {
        const left = bounds[offset];
        const right = bounds[offset + 2];
        const fraction = (x - left) / (right - left);
        const movedLeft = warpTitleCoordinate(left, center, halfWidth, 1) - left;
        const movedRight = warpTitleCoordinate(right, center, halfWidth, 1) - right;
        return movedLeft + (movedRight - movedLeft) * fraction;
    };
    const expansion = visibleDisplacement(visibleBounds[2], last)
        - visibleDisplacement(visibleBounds[0], first);
    if (!(expansion > 0) || !Number.isFinite(expansion)) return null;
    return { source: bounds.slice(), center, halfWidth, width, expansion, minX, maxX };
}

export function titleStretchStrength(metrics, targetWidth, progress) {
    if (!metrics || !Number.isFinite(targetWidth)) return 0;
    return Math.max(0, targetWidth - metrics.width) / metrics.expansion
        * Math.max(0, Math.min(1, progress));
}

export function applyTitleGlyphStretch(target, metrics, strength) {
    for (let offset = 0; offset < metrics.source.length; offset += 4) {
        target[offset] = warpTitleCoordinate(metrics.source[offset], metrics.center, metrics.halfWidth, strength);
        target[offset + 1] = metrics.source[offset + 1];
        target[offset + 2] = warpTitleCoordinate(metrics.source[offset + 2], metrics.center, metrics.halfWidth, strength);
        target[offset + 3] = metrics.source[offset + 3];
    }
}
