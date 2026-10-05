export const MENU_DECORATION_ASSETS = Object.freeze({
    music: '/images/menu/decor/moss-stones-v2.webp',
    mixes: '/images/menu/decor/bronze-cassette.webp',
    code: '/images/menu/decor/marble-braces.webp',
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const sectionSeed = (key) => {
    let value = 2166136261;
    for (let i = 0; i < key.length; i++) value = Math.imul(value ^ key.charCodeAt(i), 16777619);
    return value >>> 0;
};

const seededRandom = (seed) => {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

export function menuDecorationPoint({ screenX, screenY, depth = -1, width, height, hub = {} }) {
    const viewWidth = Math.max(1, finite(width, 390));
    const viewHeight = Math.max(1, finite(height, 844));
    const mobile = viewWidth <= 768;
    const distance = Math.max(2, finite(mobile ? hub.camDistMobile : hub.camDistDesktop, mobile ? 11 : 9.5));
    const cameraY = finite(hub.camY, 2.6) - finite(hub.itemY, 2.45);
    const drop = finite(hub.camY, 2.6) - finite(hub.lookY, 2.5);
    const length = Math.hypot(distance, drop);
    const pitchSin = drop / length;
    const pitchCos = distance / length;
    const tangent = Math.tan(clamp(finite(hub.fov, 50), 5, 120) * Math.PI / 360);
    const ndcX = (clamp(finite(screenX, 0.5), 0, 1) - 0.5) * 2;
    const ndcY = (0.5 - clamp(finite(screenY, 0.5), 0, 1)) * 2;
    const rayZ = -pitchCos - pitchSin * ndcY * tangent;
    const z = Math.min(-0.25, finite(depth, -1));
    const travel = (z - distance) / rayZ;
    return {
        position: [
            travel * ndcX * tangent * viewWidth / viewHeight,
            cameraY + travel * (-pitchSin + pitchCos * ndcY * tangent),
            z,
        ],
        unitsPerPixel: 2 * travel * tangent / viewHeight,
    };
}

export function createMenuDecorationLayout({ sectionKey, width = 390, height = 844, hub = {}, seed = 0 }) {
    if (!MENU_DECORATION_ASSETS[sectionKey]) return [];
    const viewWidth = Math.max(1, finite(width, 390));
    const viewHeight = Math.max(1, finite(height, 844));
    const mobile = viewWidth <= 768;
    const random = seededRandom((finite(seed, 0) >>> 0) ^ sectionSeed(sectionKey));
    const slots = mobile
        ? [[0.085, 0.447], [0.915, 0.583], [0.085, 0.599]]
        : [[0.135, 0.445], [0.865, 0.461], [0.16, 0.593], [0.84, 0.6]];
    const layout = [];
    for (let i = 0; i < slots.length; i++) {
        const screenX = slots[i][0] + (random() - 0.5) * (mobile ? 0.012 : 0.06);
        const screenY = slots[i][1] + (random() - 0.5) * 0.022;
        const sizePx = mobile ? 23 + random() * 9 : 46 + random() * 25;
        const depth = -0.7 - random() * 1.35;
        const point = menuDecorationPoint({ screenX, screenY, depth, width: viewWidth, height: viewHeight, hub });
        layout.push({
            screenX,
            screenY,
            sizePx,
            position: point.position,
            scale: sizePx * point.unitsPerPixel,
            rotation: [(random() - 0.5) * 0.22, (random() - 0.5) * 0.32, (random() - 0.5) * 0.72],
        });
    }
    return layout;
}

export function createMenuDecorationVisibility() {
    return {
        opacity: 0,
        elapsed: 0,
        sample(frame) {
            if (!frame.active || frame.phase !== 'menu' || frame.index !== frame.selectedIndex || !frame.ready || !frame.settled) {
                this.elapsed = 0;
                this.opacity = 0;
                return 0;
            }
            if (!frame.visible) return this.opacity;
            if (frame.skip) {
                this.opacity = 1;
                return 1;
            }
            this.elapsed += clamp(finite(frame.delta, 0), 0, 0.05);
            const progress = clamp((this.elapsed - 0.2) / 0.28, 0, 1);
            this.opacity = 1 - (1 - progress) ** 3;
            return this.opacity;
        },
    };
}
