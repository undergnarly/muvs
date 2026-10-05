export const MENU_TITLE_STRETCH_DURATION = 1;
export const MENU_TITLE_VIEWPORT_FRACTION = 0.8;
export const MENU_TITLE_BREATH_PERIOD = 3.8;
export const MENU_TITLE_BREATH_MIN = 0.95;

export function createMenuTitleStretch() {
    let previousIndex = -1;
    let elapsed = 0;
    let breathElapsed = 0;
    let active = false;
    const progressByIndex = new Float64Array(4);
    const widthFactorByIndex = new Float64Array(4).fill(1);
    return {
        index: -1,
        progress: 0,
        visible: true,
        mobile: false,
        progressFor(index) {
            return this.mobile ? (progressByIndex[index] || 0) : 0;
        },
        widthFactorFor(index) {
            return this.mobile ? (widthFactorByIndex[index] || 1) : 1;
        },
        sample({ delta, index, mobile, menu, ready, visible, skip, phase }) {
            this.index = index;
            this.visible = visible;
            this.mobile = mobile;
            if (!mobile) {
                this.progress = 0;
                return this.progress;
            }
            if (!active && !menu && phase !== 'travel' && phase !== 'foreign') return this.progress;
            if (!active || index !== previousIndex) {
                previousIndex = index;
                elapsed = 0;
                breathElapsed = 0;
                this.progress = 0;
                progressByIndex[index] = 0;
                widthFactorByIndex[index] = 1;
                active = true;
            }
            if (!ready || !visible) return this.progress;
            if (skip) {
                elapsed = MENU_TITLE_STRETCH_DURATION;
                breathElapsed = 0;
                this.progress = 1;
                progressByIndex[index] = 1;
                widthFactorByIndex[index] = 1;
                return this.progress;
            }
            const step = Number.isFinite(delta) ? Math.max(0, Math.min(0.05, delta)) : 0;
            const complete = elapsed >= MENU_TITLE_STRETCH_DURATION;
            elapsed = Math.min(MENU_TITLE_STRETCH_DURATION,
                elapsed + step);
            const t = elapsed / MENU_TITLE_STRETCH_DURATION;
            this.progress = 1 - (1 - t) ** 3;
            progressByIndex[index] = this.progress;
            if (complete && menu && (!phase || phase === 'menu')) {
                breathElapsed = (breathElapsed + step) % MENU_TITLE_BREATH_PERIOD;
                widthFactorByIndex[index] = 1 - (1 - MENU_TITLE_BREATH_MIN)
                    * 0.5 * (1 - Math.cos(2 * Math.PI * breathElapsed / MENU_TITLE_BREATH_PERIOD));
            }
            return this.progress;
        },
    };
}

export function menuTitleTargetWidth(hub = {}, aspect = 390 / 844) {
    const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
    const distance = Math.max(1, number(hub.camDistMobile, 11));
    const cameraY = number(hub.camY, 2.6);
    const itemY = number(hub.itemY, 2.45);
    const drop = cameraY - number(hub.lookY, 2.5);
    const length = Math.hypot(distance, drop);
    const titleDepth = Math.max(0.1, (distance + 1.2) * distance / length + (cameraY - itemY - 2.25) * drop / length);
    const fov = Math.max(5, Math.min(120, number(hub.fov, 50)));
    const ratio = Math.max(0.01, number(aspect, 390 / 844));
    return 2 * titleDepth * Math.tan(fov * Math.PI / 360) * ratio * MENU_TITLE_VIEWPORT_FRACTION;
}

export function warpTitleCoordinate(x, center, halfWidth, strength) {
    if (!(halfWidth > 0) || !Number.isFinite(strength)) return x;
    return x + strength * (x - center);
}

export function measureTitleGlyphs(bounds, visibleBounds) {
    if (!bounds?.length || bounds.length % 4 || !visibleBounds?.length) return null;
    const width = visibleBounds[2] - visibleBounds[0];
    if (!(width > 0) || !Number.isFinite(width)) return null;
    const center = (visibleBounds[0] + visibleBounds[2]) / 2;
    const halfWidth = width / 2;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let offset = 0; offset < bounds.length; offset += 4) {
        minX = Math.min(minX, bounds[offset]);
        maxX = Math.max(maxX, bounds[offset + 2]);
    }
    return { source: bounds.slice(), center, halfWidth, width, expansion: width, minX, maxX };
}

export function titleStretchStrength(metrics, targetWidth, progress, widthFactor = 1) {
    if (!metrics || !Number.isFinite(targetWidth)) return 0;
    const width = metrics.width + Math.max(0, targetWidth - metrics.width) * Math.max(0, Math.min(1, progress));
    const factor = Number.isFinite(widthFactor) ? Math.max(MENU_TITLE_BREATH_MIN, Math.min(1, widthFactor)) : 1;
    return (width * factor - metrics.width) / metrics.expansion;
}

export function applyTitleGlyphStretch(target, metrics, strength) {
    for (let offset = 0; offset < metrics.source.length; offset += 4) {
        target[offset] = warpTitleCoordinate(metrics.source[offset], metrics.center, metrics.halfWidth, strength);
        target[offset + 1] = metrics.source[offset + 1];
        target[offset + 2] = warpTitleCoordinate(metrics.source[offset + 2], metrics.center, metrics.halfWidth, strength);
        target[offset + 3] = metrics.source[offset + 3];
    }
}
