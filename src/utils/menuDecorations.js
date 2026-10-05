import { MENU_DECORATION_ASSETS } from '../data/menuDecorAssets.js';

export { MENU_DECORATION_ASSETS };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const GROUND_SLOTS = {
    music: {
        mobile: [
            { variant: 0, x: 0.085, depth: -0.055, size: 28, yaw: -0.08, roll: 0.03 },
            { variant: 1, x: 0.915, depth: 0.12, size: 29, yaw: 0.07, roll: -0.025 },
            { variant: 2, x: 0.085, floor: 0.84, size: 26, yaw: -0.1, roll: 0.04 },
            { variant: 3, x: 0.085, floor: 1.22, size: 28, yaw: 0.09, roll: -0.04, foreground: true },
            { variant: 4, x: 0.915, floor: 1.35, size: 29, yaw: -0.07, roll: 0.02, foreground: true },
        ],
        desktop: [
            { variant: 0, x: 0.18, depth: -0.06, size: 54, yaw: -0.08, roll: 0.03 },
            { variant: 1, x: 0.82, depth: -0.02, size: 60, yaw: 0.07, roll: -0.025 },
            { variant: 2, x: 0.07, floor: 0.84, size: 52, yaw: -0.1, roll: 0.04 },
            { variant: 3, x: 0.085, floor: 1.22, size: 59, yaw: 0.09, roll: -0.04, foreground: true },
            { variant: 4, x: 0.915, floor: 1.35, size: 58, yaw: -0.07, roll: 0.02, foreground: true },
        ],
    },
    mixes: {
        mobile: [
            { variant: 0, x: 0.085, depth: -0.055, size: 30, yaw: -0.08, roll: 0.025 },
            { variant: 1, x: 0.915, depth: 0.12, size: 29, yaw: 0.07, roll: -0.03 },
            { variant: 5, x: 0.075, floor: 0.84, size: 28, yaw: -0.07, roll: 0.025 },
            { variant: 2, x: 0.948, floor: 0.84, size: 25, yaw: 0.09, roll: -0.025 },
            { variant: 6, x: 0.085, floor: 1.22, size: 31, yaw: -0.07, roll: 0.025, foreground: true },
            { variant: 7, x: 0.915, floor: 1.35, size: 30, yaw: 0.08, roll: -0.025, foreground: true },
        ],
        desktop: [
            { variant: 0, x: 0.18, depth: -0.06, size: 55, yaw: -0.08, roll: 0.025 },
            { variant: 1, x: 0.82, depth: -0.02, size: 56, yaw: 0.07, roll: -0.03 },
            { variant: 3, x: 0.13, depth: 0.13, size: 52, yaw: -0.09, roll: 0.035 },
            { variant: 5, x: 0.07, floor: 0.84, size: 59, yaw: -0.07, roll: 0.025 },
            { variant: 2, x: 0.93, floor: 0.84, size: 56, yaw: 0.09, roll: -0.025 },
            { variant: 6, x: 0.085, floor: 1.22, size: 61, yaw: -0.07, roll: 0.025, foreground: true },
            { variant: 7, x: 0.915, floor: 1.35, size: 59, yaw: 0.08, roll: -0.025, foreground: true },
        ],
    },
};

const CODE_SLOTS = {
    mobile: [
        { x: 0.085, y: 0.447, size: 28, depth: -0.9, rotation: [0.04, -0.1, -0.19], phase: 0.3, period: 5.1 },
        { x: 0.915, y: 0.583, size: 30, depth: -1.6, rotation: [-0.05, 0.08, 0.21], phase: 2.1, period: 6.2 },
        { x: 0.085, y: 0.599, size: 26, depth: -1.2, rotation: [0.06, -0.12, -0.24], phase: 4.7, period: 5.7 },
    ],
    desktop: [
        { x: 0.135, y: 0.445, size: 58, depth: -0.9, rotation: [0.04, -0.1, -0.19], phase: 0.3, period: 5.1 },
        { x: 0.865, y: 0.461, size: 62, depth: -1.6, rotation: [-0.05, 0.08, 0.21], phase: 2.1, period: 6.2 },
        { x: 0.16, y: 0.593, size: 51, depth: -1.2, rotation: [0.06, -0.12, -0.24], phase: 4.7, period: 5.7 },
        { x: 0.84, y: 0.6, size: 57, depth: -1.8, rotation: [-0.04, 0.11, 0.17], phase: 1.3, period: 6.6 },
    ],
};

// Opaque feet of the approved 720 px hero masks; the image box includes bottom padding.
const GROUND_FEET = { music: -339 / 720, mixes: -329 / 720 };
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

export function menuDecorationFoot(sectionKey, roll = 0, asset = MENU_DECORATION_ASSETS[sectionKey]?.findLast((variant) => variant.footHull?.length)) {
    const hull = asset?.footHull;
    if (!hull) return { x: 0, y: -0.5 };
    const longestSide = Math.max(asset.width, asset.height);
    const sine = Math.sin(roll);
    const cosine = Math.cos(roll);
    let lowest = Infinity;
    let footX = 0;
    for (let i = 0; i < hull.length; i++) {
        const y = (hull[i][0] * sine + hull[i][1] * cosine) / longestSide;
        if (y < lowest) {
            lowest = y;
            footX = (hull[i][0] * cosine - hull[i][1] * sine) / longestSide;
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

function createGroundLayout({ sectionKey, width, height, hub, variants }) {
    const options = { width, height, hub };
    const camera = decorationCamera(options);
    const mobile = width <= 768;
    const groundY = menuDecorationGroundY(sectionKey, hub);
    const slots = GROUND_SLOTS[sectionKey][mobile ? 'mobile' : 'desktop'];
    const seen = new Set();
    const revealBack = Math.max(1.6, camera.distance * 0.32);
    const layout = [];
    for (const slot of slots) {
        const asset = variants[slot.variant];
        if (!asset?.src || seen.has(asset.src) || !Number.isFinite(asset.width) || asset.width <= 0
            || !Number.isFinite(asset.height) || asset.height <= 0 || !asset.footHull?.length
            || !asset.footHull.every((point) => point.length === 2 && point.every(Number.isFinite))) continue;
        seen.add(asset.src);
        const foreground = Boolean(slot.foreground);
        const screenX = slot.x;
        let depth;
        if (slot.floor) {
            const ndcY = (0.5 - slot.floor) * 2;
            const rayY = -camera.pitchSin + camera.pitchCos * ndcY * camera.tangent;
            const rayZ = -camera.pitchCos - camera.pitchSin * ndcY * camera.tangent;
            depth = camera.distance + (groundY - camera.cameraY) / rayY * rayZ;
        } else {
            depth = camera.distance * slot.depth;
        }
        const reference = { ...options, cameraBack: foreground ? revealBack : 0 };
        const base = projectMenuDecoration([0, groundY, depth], reference);
        const sizePx = slot.size;
        const scale = sizePx * base.unitsPerPixel;
        const roll = slot.roll;
        const yaw = slot.yaw;
        const foot = menuDecorationFoot(sectionKey, roll, asset);
        const centerY = groundY - foot.y * scale;
        const centerProjection = projectMenuDecoration([0, centerY, depth], reference);
        const centerX = (screenX - 0.5) * width * centerProjection.unitsPerPixel;
        const contact = [centerX + foot.x * Math.cos(yaw) * scale, groundY, depth - foot.x * Math.sin(yaw) * scale];
        const position = [centerX, centerY, depth];
        const projected = projectMenuDecoration(position, options);
        const longestSide = Math.max(asset.width, asset.height);
        layout.push({ screenX: projected.screenX, screenY: projected.screenY, sizePx, position, scale, asset,
            planeSize: [asset.width / longestSide, asset.height / longestSide],
            rotation: [0, yaw, roll], grounded: true, foreground, belowCaption: !foreground && Boolean(slot.floor), groundY, foot,
            shadow: { position: [contact[0], contact[1] + 0.006, contact[2]], size: [scale * 0.76, scale * 0.26] } });
    }
    return layout;
}

export function createMenuDecorationLayout({ sectionKey, width = 390, height = 844, hub = {},
    variants = MENU_DECORATION_ASSETS[sectionKey] }) {
    if (!MENU_DECORATION_ASSETS[sectionKey]) return [];
    const viewWidth = Math.max(1, finite(width, 390));
    const viewHeight = Math.max(1, finite(height, 844));
    const mobile = viewWidth <= 768;
    if (sectionKey === 'music' || sectionKey === 'mixes') {
        return createGroundLayout({ sectionKey, width: viewWidth, height: viewHeight, hub, variants });
    }
    const slots = CODE_SLOTS[mobile ? 'mobile' : 'desktop'];
    const layout = [];
    for (const slot of slots) {
        const screenX = slot.x;
        const screenY = slot.y;
        const sizePx = slot.size;
        const depth = slot.depth;
        const point = menuDecorationPoint({ screenX, screenY, depth, width: viewWidth, height: viewHeight, hub });
        const asset = MENU_DECORATION_ASSETS.code[0];
        const longestSide = Math.max(asset.width, asset.height);
        layout.push({
            asset,
            planeSize: [asset.width / longestSide, asset.height / longestSide],
            screenX,
            screenY,
            sizePx,
            position: point.position,
            scale: sizePx * point.unitsPerPixel,
            rotation: [...slot.rotation],
            grounded: false,
            motion: { phase: slot.phase, period: slot.period,
                amplitude: Math.min(0.035, sizePx * point.unitsPerPixel * 0.07), yaw: 0.035, roll: 0.026 },
        });
    }
    return layout;
}

export function createMenuDecorationTextureCache(loadTexture) {
    const records = new Map();
    return {
        get(src) {
            if (!records.has(src)) records.set(src, { src, texture: null, promise: null, failed: false });
            return records.get(src);
        },
        start(record) {
            if (record.promise) return record.promise;
            record.promise = Promise.resolve().then(() => loadTexture(record.src)).then((texture) => {
                record.texture = texture;
                return texture;
            }, () => {
                record.failed = true;
                return null;
            });
            return record.promise;
        },
    };
}

export function createMenuDecorationVisibility() {
    return {
        opacity: 0,
        baseOpacity: 0,
        elapsed: 0,
        reset() {
            this.elapsed = 0;
            this.baseOpacity = 0;
            this.opacity = 0;
        },
        sample(frame) {
            if (!frame.active || (frame.phase !== 'menu' && frame.phase !== 'travel') || frame.index !== frame.selectedIndex || !frame.ready) {
                this.reset();
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

export function createMenuDecorationTimeline() {
    return {
        logicalIndex: -1,
        visibility: createMenuDecorationVisibility(),
        motionClock: createMenuDecorationClock(),
        select(logicalIndex) {
            if (this.logicalIndex === logicalIndex) return;
            this.logicalIndex = logicalIndex;
            this.visibility.reset();
            this.motionClock.elapsed = 0;
        },
        sample(frame) {
            if (frame.index !== frame.selectedIndex) return 0;
            return this.visibility.sample(frame);
        },
        sampleMotion(frame) {
            if (frame.index !== frame.selectedIndex) return this.motionClock.elapsed;
            return this.motionClock.sample(frame);
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
