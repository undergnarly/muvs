const clamp = (value) => Math.min(255, Math.max(0, Math.round(value)));
const noise = (x, y, seed) => {
    let value = Math.imul(x + 17, 374761393) ^ Math.imul(y + 29, 668265263) ^ Math.imul(seed + 3, 1274126177);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

export function menuPropPatinaNoise(x, y, seed) {
    const gridX = Math.floor(x / 9);
    const gridY = Math.floor(y / 9);
    const tx = x / 9 - gridX;
    const ty = y / 9 - gridY;
    const u = tx * tx * (3 - 2 * tx);
    const v = ty * ty * (3 - 2 * ty);
    const top = noise(gridX, gridY, seed) * (1 - u) + noise(gridX + 1, gridY, seed) * u;
    const bottom = noise(gridX, gridY + 1, seed) * (1 - u) + noise(gridX + 1, gridY + 1, seed) * u;
    return top * (1 - v) + bottom * v;
}

export function menuPropVinylGrooves(radius) {
    const frequency = Math.PI * 96;
    const footprint = frequency / (2 * 128);
    return Math.sin(radius * frequency) * 8 * Math.sin(footprint) / footprint;
}

function bronzePixel(x, y, variant) {
    const grain = (noise(x, y, variant) - 0.5) * 19;
    const worn = menuPropPatinaNoise(x, y, variant + 31);
    const patina = Math.max(0, worn - 0.66) * 2.2;
    return [clamp(150 + grain - patina * 60), clamp(105 + grain + patina * 2), clamp(61 + grain + patina * 13)];
}

function cassettePixel(u, v, face, base, variant) {
    if (face < 4) {
        const seam = Math.abs(v - 0.5) < 0.028;
        return seam ? [69, 48, 28] : base;
    }
    const faceY = (v - 0.5) * 0.64;
    const faceX = u - 0.5;
    const screw = Math.hypot(Math.abs(faceX) - 0.429, Math.abs(faceY) - 0.266);
    if (screw < 0.014) return screw < 0.004 ? [48, 38, 24] : [188, 153, 96];
    if (Math.abs(faceY + 0.245) < 0.021 && Math.abs(faceX) < 0.32) return [81, 58, 33];
    if (face === 5) {
        const horizontal = Math.abs(faceY - 0.09) < 0.012 || Math.abs(faceY + 0.08) < 0.007;
        return horizontal && Math.abs(faceX) < 0.29 ? [104, 82, 48] : base;
    }
    if (v > 0.746 && v < 0.916 && u > 0.115 && u < 0.886) {
        const stripe = Math.abs(v - (0.803 + (variant % 3) * 0.017)) < 0.014;
        return stripe ? [83, 104, 79] : [172 + variant % 4 * 5, 137, 90];
    }
    if (Math.abs(faceX) < 0.368 && Math.abs(faceY) < 0.111) {
        const left = Math.hypot(faceX + 0.24, faceY);
        const right = Math.hypot(faceX - 0.24, faceY);
        const hub = Math.min(left, right);
        if (hub < 0.068) return hub < 0.019 ? [47, 36, 22] : [122, 101, 64];
        if (Math.abs(faceX) < 0.105 && Math.abs(faceY) < 0.015) return [143, 99, 50];
        return [50, 41, 26];
    }
    return base;
}

function discPixel(u, v, kind, base, variant) {
    const x = u - 0.5;
    const y = v - 0.5;
    const radius = Math.hypot(x, y);
    const angle = Math.atan2(y, x);
    if (kind === 'vinyl') {
        if (radius < 0.138) {
            const stripe = Math.abs(y - (variant % 3 - 1) * 0.026) < 0.007 && Math.abs(x) < 0.093;
            return stripe ? [69, 63, 38] : [160, 132, 78];
        }
        const grooves = menuPropVinylGrooves(radius) + Math.cos(angle - 0.8) * 9;
        return [clamp(base[0] - 15 + grooves), clamp(base[1] - 12 + grooves), clamp(base[2] - 8 + grooves)];
    }
    const cut = Math.abs(Math.sin(angle * 6 + radius * 38)) < 0.035 && radius > 0.39;
    return cut ? [114, 84, 43] : base;
}

export function createMenuPropSurface(model) {
    const kind = typeof model === 'string' ? model : model?.kind;
    if (!['cassette', 'vinyl', 'reel'].includes(kind)) return null;
    const variant = Math.abs(Math.trunc(Number.isFinite(model?.variant) ? model.variant : 0)) % 8;
    const tile = 128;
    const width = kind === 'cassette' ? tile * 3 : tile;
    const height = kind === 'cassette' ? tile * 2 : tile;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const u = ((x % tile) + 0.5) / tile;
        const v = ((y % tile) + 0.5) / tile;
        const base = bronzePixel(x, y, variant);
        const face = Math.floor(x / tile) + Math.floor(y / tile) * 3;
        const color = kind === 'cassette' ? cassettePixel(u, v, face, base, variant) : discPixel(u, v, kind, base, variant);
        const offset = (y * width + x) * 4;
        pixels[offset] = color[0];
        pixels[offset + 1] = color[1];
        pixels[offset + 2] = color[2];
        pixels[offset + 3] = 255;
    }
    return { width, height, pixels };
}

export function applyMenuPropOpacity(materials, opacity) {
    const transparent = opacity < 0.999;
    for (let i = 0; i < materials.length; i++) {
        const material = materials[i];
        if (!material) continue;
        if (material.opacity !== opacity) material.opacity = opacity;
        if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
        }
        if (material.depthWrite !== !transparent) material.depthWrite = !transparent;
    }
}
