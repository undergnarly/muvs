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

// Opaque feet of the approved 720 px hero masks; the image box includes bottom padding.
const GROUND_FEET = { music: -339 / 720, mixes: -329 / 720 };
// Lower convex hulls of the 384 px prop alpha masks (alpha > 96), centered with Y upward.
// Rotating this hull, rather than the padded square, keeps every varied cutout in contact.
const SPRITE_FEET = {
    music: [[-167, -70], [-155, -74], [-106, -89], [-69, -100], [-4, -115], [20, -117], [50, -119], [54, -119], [152, -115], [160, -112], [168, -90]],
    mixes: [[-163, 56], [-160, -57], [-159, -88], [-158, -105], [-157, -107], [-154, -112], [-144, -122], [-140, -125], [-136, -127], [-125, -127], [-77, -123], [-67, -122], [-31, -116], [53, -101], [69, -98], [100, -92], [105, -91], [118, -88], [153, -77], [156, -76], [159, -74], [163, -70], [164, -68], [165, -52]],
};
const smoothstep = (value) => {
    const t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
};

function decorationCamera({ width, height, hub = {}, cameraBack = 0 }) {
    const viewWidth = Math.max(1, finite(width, 390));
    const viewHeight = Math.max(1, finite(height, 844));
    const mobile = viewWidth <= 768;
    const distance = Math.max(2, finite(mobile ? hub.camDistMobile : hub.camDistDesktop, mobile ? 11 : 9.5)) + finite(cameraBack, 0);
    const cameraY = finite(hub.camY, 2.6) - finite(hub.itemY, 2.45);
    const drop = finite(hub.camY, 2.6) - finite(hub.lookY, 2.5);
    const length = Math.hypot(distance, drop);
    return { viewWidth, viewHeight, distance, cameraY, pitchSin: drop / length, pitchCos: distance / length,
        tangent: Math.tan(clamp(finite(hub.fov, 50), 5, 120) * Math.PI / 360) };
}

export function menuDecorationGroundY(sectionKey, hub = {}) {
    return Math.max(0.5, finite(hub.itemSize, 3.4)) * (GROUND_FEET[sectionKey] ?? -0.5);
}

export function menuDecorationFoot(sectionKey, roll = 0) {
    const hull = SPRITE_FEET[sectionKey];
    if (!hull) return { x: 0, y: -0.5 };
    const sine = Math.sin(roll);
    const cosine = Math.cos(roll);
    let lowest = Infinity;
    let footX = 0;
    for (let i = 0; i < hull.length; i++) {
        const y = (hull[i][0] * sine + hull[i][1] * cosine) / 384;
        if (y < lowest) {
            lowest = y;
            footX = (hull[i][0] * cosine - hull[i][1] * sine) / 384;
        }
    }
    return { x: footX, y: lowest };
}

export function projectMenuDecoration(position, options) {
    const camera = decorationCamera(options);
    const dy = position[1] - camera.cameraY;
    const dz = position[2] - camera.distance;
    const depth = -dy * camera.pitchSin - dz * camera.pitchCos;
    const up = dy * camera.pitchCos - dz * camera.pitchSin;
    return {
        screenX: 0.5 + position[0] / (2 * depth * camera.tangent * camera.viewWidth / camera.viewHeight),
        screenY: 0.5 - up / (2 * depth * camera.tangent),
        unitsPerPixel: 2 * depth * camera.tangent / camera.viewHeight,
        depth,
    };
}

export function menuDecorationPoint({ screenX, screenY, depth = -1, width, height, hub = {} }) {
    const { viewWidth, viewHeight, distance, cameraY, pitchSin, pitchCos, tangent } = decorationCamera({ width, height, hub });
    const ndcX = (clamp(finite(screenX, 0.5), 0, 1) - 0.5) * 2;
    const ndcY = (0.5 - clamp(finite(screenY, 0.5), 0, 1)) * 2;
    const rayZ = -pitchCos - pitchSin * ndcY * tangent;
    const z = Math.min(distance - 0.25, finite(depth, -1));
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

function createGroundLayout({ sectionKey, width, height, hub, random }) {
    const options = { width, height, hub };
    const camera = decorationCamera(options);
    const mobile = width <= 768;
    const groundY = menuDecorationGroundY(sectionKey, hub);
    const slots = mobile ? [[0.085, -0.055], [0.915, 0.12], [0.08, 0.24]]
        : [[0.18, -0.06], [0.82, -0.02], [0.12, 0.13], [0.88, 0.23], [0.85, 0.045]];
    const count = slots.length + 2;
    const revealBack = Math.max(1.6, camera.distance * 0.32);
    const layout = [];
    for (let i = 0; i < count; i++) {
        const foreground = i >= slots.length;
        const captionSide = mobile && sectionKey === 'mixes' && i === 2;
        const side = foreground ? ((i - slots.length) % 2 ? 0.915 : 0.085) : captionSide ? 0.052 : slots[i][0];
        const screenX = side + (random() - 0.5) * (mobile ? 0.008 : 0.03);
        let depth;
        if (foreground) {
            // Solve a fixed floor point below the viewport; it enters by camera parallax,
            // never by moving/re-anchoring the object to the screen during scrolling.
            const belowFoldY = 1.12 + (i - slots.length) * 0.13 + random() * 0.025;
            const ndcY = (0.5 - belowFoldY) * 2;
            const rayY = -camera.pitchSin + camera.pitchCos * ndcY * camera.tangent;
            const rayZ = -camera.pitchCos - camera.pitchSin * ndcY * camera.tangent;
            depth = camera.distance + (groundY - camera.cameraY) / rayY * rayZ;
        } else {
            depth = camera.distance * (slots[i][1] + (random() - 0.5) * 0.025);
        }
        const reference = { ...options, cameraBack: foreground ? revealBack : 0 };
        const base = projectMenuDecoration([0, groundY, depth], reference);
        const sizePx = mobile ? 24 + random() * (captionSide ? 3 : 9) : 46 + random() * 24;
        const scale = sizePx * base.unitsPerPixel;
        const roll = (random() - 0.5) * 0.16;
        const yaw = (random() - 0.5) * 0.28;
        const foot = menuDecorationFoot(sectionKey, roll);
        const centerY = groundY - foot.y * scale;
        const centerProjection = projectMenuDecoration([0, centerY, depth], reference);
        const centerX = (screenX - 0.5) * width * centerProjection.unitsPerPixel;
        const contact = [centerX + foot.x * Math.cos(yaw) * scale, groundY, depth - foot.x * Math.sin(yaw) * scale];
        const position = [centerX, centerY, depth];
        const projected = projectMenuDecoration(position, options);
        layout.push({ screenX: projected.screenX, screenY: projected.screenY, sizePx, position, scale,
            rotation: [0, yaw, roll], grounded: true, foreground, groundY, foot,
            shadow: { position: [contact[0], contact[1] + 0.006, contact[2]], size: [scale * 0.76, scale * 0.26] } });
    }
    return layout;
}

export function createMenuDecorationLayout({ sectionKey, width = 390, height = 844, hub = {}, seed = 0 }) {
    if (!MENU_DECORATION_ASSETS[sectionKey]) return [];
    const viewWidth = Math.max(1, finite(width, 390));
    const viewHeight = Math.max(1, finite(height, 844));
    const mobile = viewWidth <= 768;
    const random = seededRandom((finite(seed, 0) >>> 0) ^ sectionSeed(sectionKey));
    if (sectionKey === 'music' || sectionKey === 'mixes') {
        return createGroundLayout({ sectionKey, width: viewWidth, height: viewHeight, hub, random });
    }
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
            grounded: false,
            motion: { phase: random() * Math.PI * 2, period: 4.4 + random() * 2.5,
                amplitude: Math.min(0.035, sizePx * point.unitsPerPixel * 0.07), yaw: 0.035, roll: 0.026 },
        });
    }
    return layout;
}

export function createMenuDecorationVisibility() {
    return {
        opacity: 0,
        baseOpacity: 0,
        elapsed: 0,
        sample(frame) {
            if (!frame.active || (frame.phase !== 'menu' && frame.phase !== 'travel') || frame.index !== frame.selectedIndex || !frame.ready) {
                this.elapsed = 0;
                this.baseOpacity = 0;
                this.opacity = 0;
                return 0;
            }
            if (!frame.visible) return this.opacity;
            if (frame.phase === 'travel') {
                if ((frame.direction < 0 && this.baseOpacity === 0) || frame.skip) {
                    this.baseOpacity = 1;
                    this.elapsed = 0.48;
                } else if (frame.direction >= 0) {
                    this.baseOpacity = Math.max(this.baseOpacity, smoothstep(finite(frame.travel, 0) / 0.14));
                } else {
                    this.elapsed = Math.max(this.elapsed, 0.2 + 0.28 * (1 - Math.cbrt(1 - this.baseOpacity)));
                }
                this.opacity = this.baseOpacity * (1 - smoothstep((finite(frame.travel, 0) - 0.3) / 0.22));
                return this.opacity;
            }
            if (!frame.settled && this.baseOpacity === 0) return 0;
            if (frame.skip) this.elapsed = 0.48;
            if (this.baseOpacity > 0) this.elapsed = Math.max(this.elapsed, 0.2 + 0.28 * (1 - Math.cbrt(1 - this.baseOpacity)));
            this.elapsed += clamp(finite(frame.delta, 0), 0, 0.05);
            const progress = clamp((this.elapsed - 0.2) / 0.28, 0, 1);
            this.baseOpacity = 1 - (1 - progress) ** 3;
            this.opacity = this.baseOpacity;
            return this.opacity;
        },
    };
}

export function createMenuDecorationClock() {
    return {
        elapsed: 0,
        sample(frame) {
            if (frame.visible && frame.rendered && !frame.skip) this.elapsed += clamp(finite(frame.delta, 0), 0, 0.05);
            return this.elapsed;
        },
    };
}

export function menuDecorationMotion(prop, time, output, enabled = true) {
    if (!enabled || !prop.motion) {
        output.y = 0;
        output.yaw = 0;
        output.roll = 0;
        return output;
    }
    const phase = finite(time, 0) * 2 * Math.PI / prop.motion.period + prop.motion.phase;
    output.y = Math.sin(phase) * prop.motion.amplitude;
    output.yaw = Math.sin(phase * 0.83 + 0.7) * prop.motion.yaw;
    output.roll = Math.sin(phase * 0.71 + 1.4) * prop.motion.roll;
    return output;
}
