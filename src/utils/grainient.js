/*!
 * Grainient by David Haz / React Bits, specialized for the supplied MUVS preset.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause.
 * Full license: /third-party-notices.txt (source: THIRD_PARTY_NOTICES.md).
 * Source: https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds/Grainient
 * No flow or pointer interaction: the silk/Oklab field is static and cached;
 * only its film-grain composite changes. Both renderers share these shaders.
 */
export const GRAINIENT_SETTINGS = Object.freeze({
    colors: Object.freeze(['#454545', '#bfbfbf', '#e3e3e3', '#e0e0e0', '#ffffff']),
    angle: 179, flow: 0, silk: 1, grainAmount: 0.04, scale: 0.8, speed: 0.5,
    grainSize: 0.5, contrast: 1.29, saturation: 0.18, interactive: false,
});

export const GRAINIENT_FPS = 6;
export const GRAINIENT_GRAIN_SCALE = 2;

// GLSL 300 ES without a version directive. RawShaderMaterial supplies GLSL3;
// the lightweight standalone renderer prepends the WebGL2 version directive.
// Draw one NON-INDEXED triangle with exactly three vertices, as in React Bits.
export const GRAINIENT_VERTEX_SHADER = `
out vec2 vUv;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const GRAINIENT_FIELD_FRAGMENT_SHADER = `
precision highp float;
uniform float uAspect;
uniform vec3 uRamp[5];
in vec2 vUv;
out vec4 outColor;

vec3 labToRgb(vec3 lab) {
    float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
    float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
    float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
    l = l * l * l;
    m = m * m * m;
    s = s * s * s;
    return vec3(
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec3 encode(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
    // flow=0: the original warp returns p exactly. Keep the silk lighting,
    // angle, equal stop spacing, softness=1 and Oklab contrast unchanged.
    float radians = 179.0 * 3.141592653589793 / 180.0;
    vec2 dir = vec2(sin(radians), cos(radians));
    float extent = uAspect * abs(dir.x) + abs(dir.y);
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float raw = dot(p, dir) / extent + 0.5;
    float scaled = clamp(raw, 0.0, 1.0) * 4.0;
    int index = int(min(floor(scaled), 3.0));
    float f = scaled - float(index);
    float edge = max(0.5, fwidth(scaled) * 0.75);
    float shaped = smoothstep(0.5 - edge, 0.5 + edge, f);
    vec3 lab = mix(uRamp[index], uRamp[index + 1], shaped);

    // Analytic derivative of the exact straight coordinate field. This
    // replaces three repeated warp calls, not the original silk appearance.
    vec2 grad = dir / extent;
    vec2 slope = grad * sin(3.14159265 * clamp(raw, 0.0, 1.0)) * 4.0;
    vec3 normal = normalize(vec3(-slope, 1.0));
    vec3 light = normalize(vec3(-dir.y, dir.x, 1.2));
    float diffuse = dot(normal, light) - light.z;
    lab = uRamp[0] + (lab - uRamp[0])
        * (1.0 + diffuse * 0.35 + max(diffuse, 0.0) * diffuse * 0.6);
    // The existing priority splash already supplies the entrance. Start at
    // the settled field (original uReveal=1), never replay a dark bloom.
    lab.x = (lab.x - 0.55) * 1.29 + 0.55;
    lab.yz *= 0.18;
    outColor = vec4(encode(labToRgb(lab)), 1.0);
}`;

export const GRAINIENT_COMPOSITE_FRAGMENT_SHADER = `
precision highp float;
uniform sampler2D uField;
uniform float uFrame;
uniform float uGrainAmount;
uniform float uFieldOpacity;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

void main() {
    vec3 color = mix(vec3(1.0), texture(uField, vUv).rgb, clamp(uFieldOpacity, 0.0, 1.0));
    // User override: retain the preset's fine-grain distribution/amplitude,
    // but correlate each 2x2 physical-pixel cell for twice the visible pitch.
    vec2 pixel = floor(gl_FragCoord.xy / ${GRAINIENT_GRAIN_SCALE.toFixed(1)}) + 0.5
        + uFrame * vec2(17.0, 59.0);
    float grain = hash(pixel) + hash(pixel + 7.13) - 1.0;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color += grain * uGrainAmount * (0.45 + 2.2 * luma * (1.0 - luma));
    // Already sRGB-encoded in the field. Do not add Three colorspace chunks.
    outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const smoothstep = (value) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const linear = (value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const encode = (value) => {
    const c = clamp(value, 0, 1);
    return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
};

export function createGrainientRamp() {
    return Float32Array.from(GRAINIENT_SETTINGS.colors.flatMap((hex) => {
        const [r, g, b] = [1, 3, 5].map((offset) => linear(parseInt(hex.slice(offset, offset + 2), 16) / 255));
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return [
            0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
        ];
    }));
}

// Inputs are physical drawing-buffer pixels, not CSS dimensions.
export function grainientFieldSize(width, height) {
    return {
        width: Math.max(1, Math.round(Math.max(1, finite(width, 1)) / 2)),
        height: Math.max(1, Math.round(Math.max(1, finite(height, 1)) / 2)),
    };
}

export function grainientFrame(seconds) {
    return Math.floor(Math.max(0, finite(seconds)) * GRAINIENT_FPS) % 97;
}

/** CPU reference/fallback sampler. x goes left→right, y goes top→bottom. */
export function sampleGrainientField({ x = 0.5, y = 0.5, aspect = 1, fieldOpacity = 1 } = {}) {
    const ramp = createGrainientRamp();
    const ratio = Math.max(0.0001, finite(aspect, 1));
    const radians = GRAINIENT_SETTINGS.angle * Math.PI / 180;
    const dir = [Math.sin(radians), Math.cos(radians)];
    const extent = ratio * Math.abs(dir[0]) + Math.abs(dir[1]);
    const raw = ((finite(x, 0.5) - 0.5) * ratio * dir[0] + (0.5 - finite(y, 0.5)) * dir[1]) / extent + 0.5;
    const scaled = clamp(raw, 0, 1) * 4;
    const index = Math.min(Math.floor(scaled), 3);
    const shaped = smoothstep(scaled - index);
    let lab = [0, 1, 2].map((channel) => ramp[index * 3 + channel]
        + (ramp[(index + 1) * 3 + channel] - ramp[index * 3 + channel]) * shaped);
    const factor = Math.sin(Math.PI * clamp(raw, 0, 1)) * 4;
    const slope = dir.map((value) => value / extent * factor);
    const normalLength = Math.hypot(...slope, 1);
    const light = [-dir[1], dir[0], 1.2];
    const lightLength = Math.hypot(...light);
    const diffuse = ((-slope[0] * light[0] - slope[1] * light[1] + light[2]) / normalLength - light[2]) / lightLength;
    lab = lab.map((value, channel) => ramp[channel]
        + (value - ramp[channel]) * (1 + diffuse * 0.35 + Math.max(diffuse, 0) * diffuse * 0.6));
    lab[0] = (lab[0] - 0.55) * GRAINIENT_SETTINGS.contrast + 0.55;
    lab[1] *= GRAINIENT_SETTINGS.saturation;
    lab[2] *= GRAINIENT_SETTINGS.saturation;
    const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3;
    const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3;
    const s = (lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2]) ** 3;
    const opacity = clamp(finite(fieldOpacity, 1), 0, 1);
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((value) => 1 + (encode(value) - 1) * opacity);
}

// Matched settled-field fallback for unavailable/lost WebGL, not a new design.
export const GRAINIENT_FALLBACK = 'linear-gradient(179deg, #393939 0%, #696969 10%, #adadad 20%, #bababa 30%, #cccccc 40%, #d9d9d9 50%, #d8d8d8 70%, #e1e1e1 80%, #ffffff 90%)';
