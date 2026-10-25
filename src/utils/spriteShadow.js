export const SPRITE_SHADOW_DEFAULTS = Object.freeze({
    enabled: true, opacity: .26, directionDegrees: 143, length: .55, blur: .5, depthOffset: 0,
});
export const SPRITE_SHADOW_MASK_SIZE = 256;
export const SPRITE_SHADOW_BIAS = .004;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const imageBounds = new WeakMap();
const FALLBACK_BOUNDS = Object.freeze({ minU: 0, maxU: 1, minV: 0, maxV: 1, footU: .5, footV: 0, empty: false, readable: false });

export function normalizeSpriteShadowSettings(settings = {}) {
    const defaults = SPRITE_SHADOW_DEFAULTS;
    settings = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
    return {
        enabled: typeof settings.enabled === 'boolean' ? settings.enabled : defaults.enabled,
        opacity: clamp(finite(settings.opacity, defaults.opacity), 0, 1),
        directionDegrees: ((finite(settings.directionDegrees, defaults.directionDegrees) % 360) + 360) % 360,
        length: clamp(finite(settings.length, defaults.length), .1, 3),
        blur: clamp(finite(settings.blur, defaults.blur), 0, 1),
        depthOffset: clamp(finite(settings.depthOffset, defaults.depthOffset), -1, 1),
    };
}

export function analyzeSpriteShadowMask(pixels, width, height, { channels = 4, useGreen = false, flipY = true, normalized = false, includeFootProfile = false } = {}) {
    if (!pixels || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
        || !Number.isInteger(channels) || channels < 1 || channels > 4 || pixels.length < width * height * channels) return FALLBACK_BOUNDS;
    const sample = (x, y) => {
        const channel = useGreen ? Math.min(1, channels - 1) : channels === 4 ? 3 : -1;
        if (channel < 0) return 255;
        return pixels[(y * width + x) * channels + channel] * (normalized ? 255 : 1);
    };
    let left = width, right = -1, top = height, bottom = -1;
    const footRows = includeFootProfile ? new Int16Array(width).fill(-1) : null;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const alpha = sample(x, y);
        if (alpha <= 8) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
        if (footRows && alpha > 96 && (flipY || footRows[x] < 0)) footRows[x] = y;
    }
    if (right < left) return Object.freeze({ ...FALLBACK_BOUNDS, empty: true, readable: true });
    const band = Math.max(1, Math.ceil(height * .015));
    const start = flipY ? Math.max(top, bottom - band + 1) : top;
    const end = flipY ? bottom : Math.min(bottom, top + band - 1);
    let footWeight = 0, footX = 0;
    for (let y = start; y <= end; y++) for (let x = left; x <= right; x++) {
        const alpha = sample(x, y);
        if (alpha <= 8) continue;
        footWeight += alpha;
        footX += (x + .5) / width * alpha;
    }
    const maxV = flipY ? 1 - top / height : (bottom + 1) / height;
    const footProfile = footRows ? Object.freeze(Array.from(footRows, (row, column) => {
        if (row < 0) return null;
        const v = flipY ? 1 - (row + .5) / height : (row + .5) / height;
        return Object.freeze({ u: (column + .5) / width, v, sampleV: Math.min(maxV, v + 1 / height) });
    })) : undefined;
    return Object.freeze({
        minU: left / width, maxU: (right + 1) / width,
        minV: flipY ? 1 - (bottom + 1) / height : top / height,
        maxV,
        footU: footWeight ? footX / footWeight : (left + right + 1) / (2 * width),
        footV: flipY ? 1 - (bottom + .5) / height : (top + .5) / height,
        empty: false, readable: true,
        ...(footProfile ? { footProfile } : {}),
    });
}

const defaultCanvas = () => typeof document === 'undefined' ? null : document.createElement('canvas');

export function getSpriteShadowMaskBounds(image, { useGreen = false, flipY = true, createCanvas = defaultCanvas, includeFootProfile = false } = {}) {
    if (!image || (typeof image !== 'object' && typeof image !== 'function')) return FALLBACK_BOUNDS;
    const key = `${useGreen ? 'green' : 'alpha'}:${flipY ? 'flipped' : 'raw'}${includeFootProfile ? ':feet' : ''}`;
    const cached = imageBounds.get(image);
    if (cached?.[key]) return cached[key];
    const width = image.naturalWidth || image.videoWidth || image.width;
    const height = image.naturalHeight || image.videoHeight || image.height;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return FALLBACK_BOUNDS;
    const scale = Math.min(1, SPRITE_SHADOW_MASK_SIZE / Math.max(width, height));
    const sampleWidth = Math.max(1, Math.round(width * scale));
    const sampleHeight = Math.max(1, Math.round(height * scale));
    let bounds = FALLBACK_BOUNDS;
    try {
        if (image.data && ArrayBuffer.isView(image.data)) {
            const channels = image.data.length / (width * height);
            if (!Number.isInteger(channels) || channels < 1 || channels > 4) throw new Error('Unsupported mask channels');
            const normalized = image.data instanceof Float32Array || image.data instanceof Float64Array;
            const pixels = new Uint8Array(sampleWidth * sampleHeight * channels);
            for (let y = 0; y < sampleHeight; y++) for (let x = 0; x < sampleWidth; x++) {
                const sx = Math.min(width - 1, Math.floor((x + .5) * width / sampleWidth));
                const sy = Math.min(height - 1, Math.floor((y + .5) * height / sampleHeight));
                for (let c = 0; c < channels; c++) pixels[(y * sampleWidth + x) * channels + c]
                    = Math.round(image.data[(sy * width + sx) * channels + c] * (normalized ? 255 : 1));
            }
            bounds = analyzeSpriteShadowMask(pixels, sampleWidth, sampleHeight, { channels, useGreen, flipY, includeFootProfile });
        } else {
            const canvas = createCanvas();
            if (!canvas) throw new Error('Canvas unavailable');
            canvas.width = sampleWidth; canvas.height = sampleHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Canvas unavailable');
            context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
            bounds = analyzeSpriteShadowMask(context.getImageData(0, 0, sampleWidth, sampleHeight).data,
                sampleWidth, sampleHeight, { useGreen, flipY, includeFootProfile });
        }
    } catch { /* Cross-origin/readback failure keeps the original GPU alpha and safe full-image bounds. */ }
    const record = cached || {};
    record[key] = bounds;
    imageBounds.set(image, record);
    return bounds;
}

export function spriteShadowBasis(directionDegrees) {
    const angle = finite(directionDegrees, SPRITE_SHADOW_DEFAULTS.directionDegrees) * Math.PI / 180;
    const sine = Math.sin(angle);
    const naturalDepth = -Math.cos(angle);
    // A sprite's entire foot row stays parallel to its own X axis: rotating
    // this baseline peels its shadow away from one side of the object. Shear
    // only the cast direction instead. Exactly sideward casts retain a small
    // front-facing thickness rather than becoming invisible zero-area planes.
    const depthSign = Math.abs(naturalDepth) < 1e-10 ? 1 : Math.sign(naturalDepth);
    const castZ = depthSign * Math.max(.15, Math.abs(naturalDepth));
    const castX = Math.abs(naturalDepth) < .15
        ? Math.sign(sine) * Math.sqrt(1 - castZ * castZ) : sine;
    return {
        rightX: 1, rightZ: 0,
        castX, castZ,
    };
}

export function createSpriteShadowLayout({ width, height, position = [0, 0, 0], floorY, bounds = FALLBACK_BOUNDS, settings, contactCamera } = {}) {
    const config = normalizeSpriteShadowSettings(settings);
    if (!config.enabled || config.opacity <= 0 || bounds.empty || !Number.isFinite(width) || !Number.isFinite(height)
        || width <= 0 || height <= 0) return null;
    const x = finite(position[0], 0), y = finite(position[1], 0), z = finite(position[2], 0);
    const opaqueHeight = Math.max(height / SPRITE_SHADOW_MASK_SIZE, (bounds.maxV - bounds.footV) * height);
    const length = opaqueHeight * config.length;
    const maximumBlur = config.blur * Math.min(width, opaqueHeight) * .11;
    const padding = maximumBlur * 1.5 + Math.max(width, height * config.length) / SPRITE_SHADOW_MASK_SIZE;
    const footY = y + (bounds.footV - .5) * height;
    // Manual placement is independent of the cast: positive means behind the
    // object along local -Z, measured against opaque height, never image padding.
    const depthShift = -config.depthOffset * opaqueHeight;
    const contact = [x + (bounds.footU - .5) * width, finite(floorY, footY) + SPRITE_SHADOW_BIAS, z + depthShift];
    const basis = spriteShadowBasis(config.directionDegrees);
    const sides = [(bounds.minU - bounds.footU) * width - padding, (bounds.maxU - bounds.footU) * width + padding];
    const depths = [-padding, length + padding];
    const positions = new Float32Array(12);
    const uvs = new Float32Array(8);
    const corners = [[sides[0], depths[0]], [sides[1], depths[0]], [sides[0], depths[1]], [sides[1], depths[1]]];
    for (let i = 0; i < 4; i++) {
        const [side, depth] = corners[i];
        positions[i * 3] = contact[0] + side + basis.castX * depth;
        positions[i * 3 + 1] = contact[1];
        positions[i * 3 + 2] = contact[2] + basis.castZ * depth;
        uvs[i * 2] = bounds.footU + side / width;
        uvs[i * 2 + 1] = bounds.footV + depth / (height * config.length);
    }
    const geometryKey = [width, height, x, y, z, floorY, config.directionDegrees, config.length, config.blur, config.depthOffset,
        bounds.minU, bounds.maxU, bounds.maxV, bounds.footU, bounds.footV].join('|');
    const layout = {
        positions, uvs, indices: new Uint16Array([0, 2, 1, 2, 3, 1]), geometryKey,
        contact, footY, opaqueHeight, length, padding, maximumBlur, basis,
        depthOffset: config.depthOffset, depthShift,
        footV: bounds.footV, maxV: bounds.maxV,
        worldToUv: [1 / width, 1 / (height * config.length)],
    };
    return appendFootContact(layout, { width, height, x, y, z, bounds, config, contactCamera });
}

// A three-quarter cutout has a sloping base. Intersect that visible contour
// with the flat floor from its authored camera, then bridge ONLY the empty
// space to the existing cast. Its original quad, extent and tuning stay exact.
// Everything is prepared once with the cached <=256px mask, not per frame.
function appendFootContact(layout, { width, height, x, y, z, bounds, config, contactCamera }) {
    if (!Array.isArray(bounds.footProfile) || !Array.isArray(contactCamera)
        || contactCamera.length !== 3 || !contactCamera.every(Number.isFinite)) return layout;
    const [cx, cy, cz] = contactCamera;
    if (cy <= layout.contact[1] + .0001 || Math.abs(cz - z) < .001) return layout;
    const vertices = [], textureUvs = [], triangles = [], contactBlend = [0, 0, 0, 0];
    let previous = null;
    for (const foot of bounds.footProfile) {
        // Ignore antennas/handles: contact belongs to the lower body only.
        if (!foot || foot.v - bounds.footV > (bounds.maxV - bounds.footV) * .65) { previous = null; continue; }
        const sx = x + (foot.u - .5) * width;
        const sy = y + (foot.v - .5) * height;
        const ratio = (layout.contact[1] - cy) / (sy - cy);
        if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 8) { previous = null; continue; }
        const nearX = cx + (sx - cx) * ratio;
        const nearZ = cz + (z - cz) * ratio;
        const depth = (foot.sampleV - bounds.footV) * height * config.length;
        const index = 4 + vertices.length / 3;
        vertices.push(nearX, layout.contact[1], nearZ,
            sx + layout.basis.castX * depth, layout.contact[1], z + layout.depthShift + layout.basis.castZ * depth);
        textureUvs.push(foot.u, foot.sampleV, foot.u, foot.sampleV);
        contactBlend.push(1, 0);
        if (previous !== null) triangles.push(previous, index, previous + 1, index, index + 1, previous + 1);
        previous = index;
    }
    if (!triangles.length) return layout;
    return { ...layout,
        positions: new Float32Array([...layout.positions, ...vertices]),
        uvs: new Float32Array([...layout.uvs, ...textureUvs]),
        indices: new Uint16Array([...layout.indices, ...triangles]),
        contactBlend: new Float32Array(contactBlend),
        geometryKey: `${layout.geometryKey}|contact:${contactCamera.join(',')}:${bounds.footProfile.map(foot => foot ? foot.v : '').join(',')}`,
        contactVertexStart: 4, contactVertexCount: vertices.length / 3,
    };
}

export function spriteShadowOpacityAt(distance, opacity = SPRITE_SHADOW_DEFAULTS.opacity) {
    const t = clamp((distance - .05) / .97, 0, 1);
    return opacity * Math.pow(1 - t * t * (3 - 2 * t), 1.1);
}

export const SPRITE_SHADOW_VERTEX = `
    attribute float contactBlend;
    varying float vContactBlend;
    varying vec2 vMaskUv;
    #include <fog_pars_vertex>
    void main() {
        vMaskUv = uv;
        vContactBlend = contactBlend;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
    }
`;

export const SPRITE_SHADOW_FRAGMENT = `
    uniform sampler2D uMask;
    uniform float uGreen;
    uniform float uOpacity;
    uniform float uFootV;
    uniform float uMaxV;
    uniform float uMaximumBlur;
    uniform vec2 uWorldToUv;
    uniform vec3 uShadowColor;
    varying vec2 vMaskUv;
    varying float vContactBlend;
    #include <fog_pars_fragment>
    float maskAt(vec2 point) {
        vec2 inside = step(vec2(0.0), point) * step(point, vec2(1.0));
        vec4 mask = texture2D(uMask, clamp(point, 0.0, 1.0));
        return mix(mask.a, mask.g, uGreen) * inside.x * inside.y;
    }
    void main() {
        float distance = clamp((vMaskUv.y - uFootV) / max(0.0001, uMaxV - uFootV), 0.0, 1.0);
        float radius = uMaximumBlur * pow(distance, 1.15);
        vec2 offset = uWorldToUv * radius;
        float mask = maskAt(vMaskUv);
        if (radius > 0.00001) {
            mask *= 0.2;
            mask += (maskAt(vMaskUv + vec2(offset.x, 0.0)) + maskAt(vMaskUv - vec2(offset.x, 0.0))
                + maskAt(vMaskUv + vec2(0.0, offset.y)) + maskAt(vMaskUv - vec2(0.0, offset.y))) * 0.12;
            vec2 diagonal = offset * 0.70710678;
            mask += (maskAt(vMaskUv + diagonal) + maskAt(vMaskUv - diagonal)
                + maskAt(vMaskUv + vec2(diagonal.x, -diagonal.y)) + maskAt(vMaskUv + vec2(-diagonal.x, diagonal.y))) * 0.08;
        }
        // The grounded edge is solid contact, not a magnified one-pixel alpha
        // fringe. Blend back to the exact original mask where the cast joins.
        mask = mix(mask, 1.0, vContactBlend);
        float alpha = mask * uOpacity * pow(1.0 - smoothstep(0.05, 1.02, distance), 1.1);
        #ifdef USE_FOG
            #ifdef FOG_EXP2
                alpha *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
            #else
                alpha *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
            #endif
        #endif
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(uShadowColor, alpha);
        #include <colorspace_fragment>
    }
`;
