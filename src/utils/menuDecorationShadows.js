import { menuPropSupport } from './menuPropGeometry.js';
import { normalizeSpriteShadowSettings } from './spriteShadow.js';

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export function menuDecorationShadowHeight(prop) {
    if (!prop?.grounded || !prop.shadow || !(prop.scale > 0)) return 0;
    if (prop.model) {
        // These centred box/disc geometries are symmetric: support gives the
        // exact posed half-height, including the very thin flat vinyl edge.
        return Math.max(0, -2 * menuPropSupport(prop.model, prop.rotation).y * prop.scale);
    }
    const asset = prop.asset;
    const bounds = asset?.opaqueBounds;
    if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite)
        || !asset.footHull?.length || !Number.isFinite(prop.foot?.y)) return 0;
    const longest = Math.max(finite(asset.width), finite(asset.height));
    if (longest <= 0) return 0;
    const roll = finite(prop.rotation?.[2]);
    const sine = Math.sin(roll), cosine = Math.cos(roll);
    const [left, right, bottom, top] = bounds;
    const highest = Math.max(left * sine + bottom * cosine, right * sine + bottom * cosine,
        left * sine + top * cosine, right * sine + top * cosine) / longest;
    // prop.foot is the already rolled support of the measured lower hull;
    // opaqueBounds supplies its top, not the padded full image rectangle.
    return Math.max(0, (highest - prop.foot.y) * prop.scale);
}

// Reuse the existing two tiny soft quads, never a shadow-map render pass.
// The core stays at the measured support before manual local-Z placement;
// only the broader accent is cast. The source prop/ground never moves.
export function createMenuDecorationShadows(prop, settings) {
    const config = normalizeSpriteShadowSettings(settings);
    if (!prop?.grounded || !prop.shadow || !config.enabled || config.opacity <= 0) return [];
    const anchor = prop.shadow.position;
    const footprint = prop.shadow.size;
    if (!Array.isArray(anchor) || !anchor.every(Number.isFinite) || anchor.length !== 3
        || !Array.isArray(footprint) || footprint.length !== 2 || !footprint.every(value => Number.isFinite(value) && value > 0)) return [];
    const rotation = prop.rotation || [0, 0, 0];
    const yaw = prop.model?.kind === 'cassette' ? prop.model.pose === 'flat' ? rotation[2] : rotation[1]
        : prop.model?.pose === 'standing' ? -rotation[2] : 0;
    const angle = config.directionDegrees * Math.PI / 180;
    const directionX = Math.sin(angle), directionZ = -Math.cos(angle);
    const height = menuDecorationShadowHeight(prop);
    const depthShift = -config.depthOffset * height;
    const castLength = height * config.length;
    const softness = .7 + .6 * config.blur;
    const width = footprint[0] * 1.45 * softness;
    const depth = footprint[1] * 1.7 * softness;
    const relativeAngle = angle + finite(yaw);
    const sine = Math.sin(relativeAngle), cosine = Math.cos(relativeAngle);
    const across = Math.hypot(width * cosine, depth * sine);
    const along = Math.hypot(width * sine, depth * cosine);
    return [
        {
            kind: 'cast', height, castLength,
            position: [anchor[0] + directionX * castLength / 2, anchor[1], anchor[2] + depthShift + directionZ * castLength / 2],
            size: [across, along + castLength], yaw: -angle, opacity: config.opacity * .55,
        },
        {
            kind: 'contact', height, castLength: 0,
            position: [anchor[0], anchor[1] + .001, anchor[2] + depthShift],
            size: [footprint[0] * .86, footprint[1] * .68], yaw: finite(yaw), opacity: config.opacity,
        },
    ];
}
