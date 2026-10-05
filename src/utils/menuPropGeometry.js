import * as THREE from 'three';

const DIMENSIONS = Object.freeze({
    cassette: Object.freeze([1, 0.64, 0.12]),
    vinyl: Object.freeze([1, 0.012, 1]),
    reel: Object.freeze([1, 0.07, 1]),
});
const clean = (value) => Math.abs(value) < 1e-12 ? 0 : value;
const kindOf = (model) => typeof model === 'string' ? model : model?.kind;

export function menuPropDimensions(model) {
    const kind = kindOf(model);
    return Object.hasOwn(DIMENSIONS, kind) ? DIMENSIONS[kind] : null;
}

export function menuPropSupport(model, rotation = [0, 0, 0]) {
    const dimensions = menuPropDimensions(model);
    if (!dimensions) return { x: 0, y: 0, z: 0 };
    const x = Number.isFinite(rotation?.[0]) ? rotation[0] : 0;
    const y = Number.isFinite(rotation?.[1]) ? rotation[1] : 0;
    const z = Number.isFinite(rotation?.[2]) ? rotation[2] : 0;
    const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
    const rowX = [c * e, -c * f, d];
    const rowY = [clean(a * f + b * e * d), clean(a * e - b * f * d), clean(-b * c)];
    const rowZ = [b * f - a * e * d, b * e + a * f * d, a * c];
    let point;
    if (kindOf(model) === 'cassette') {
        point = dimensions.map((dimension, index) => -Math.sign(rowY[index]) * dimension / 2);
    } else {
        const radius = dimensions[0] / 2;
        const horizontal = Math.hypot(rowY[0], rowY[2]);
        point = [horizontal ? -radius * rowY[0] / horizontal : 0,
            -Math.sign(rowY[1]) * dimensions[1] / 2,
            horizontal ? -radius * rowY[2] / horizontal : 0];
    }
    return {
        x: clean(rowX[0] * point[0] + rowX[1] * point[1] + rowX[2] * point[2]),
        y: clean(rowY[0] * point[0] + rowY[1] * point[1] + rowY[2] * point[2]),
        z: clean(rowZ[0] * point[0] + rowZ[1] * point[1] + rowZ[2] * point[2]),
    };
}

export function menuPropHalfHeight(model, rotation) {
    return -menuPropSupport(model, rotation).y;
}

function cassetteGeometry() {
    const geometry = new THREE.BoxGeometry(...DIMENSIONS.cassette);
    const uv = geometry.getAttribute('uv');
    for (let face = 0; face < 6; face++) {
        const column = face % 3;
        const row = Math.floor(face / 3);
        for (let vertex = face * 4; vertex < face * 4 + 4; vertex++) {
            uv.setXY(vertex, (column + 0.01 + uv.getX(vertex) * 0.98) / 3,
                (row + 0.01 + uv.getY(vertex) * 0.98) / 2);
        }
    }
    geometry.clearGroups();
    return geometry;
}

function vinylGeometry() {
    const outline = new THREE.Shape();
    outline.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
    const center = new THREE.Path();
    center.absarc(0, 0, 0.009, 0, Math.PI * 2, true);
    outline.holes.push(center);
    return extrudedDisc(outline, DIMENSIONS.vinyl[1]);
}

function extrudedDisc(outline, thickness) {
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false, curveSegments: 16, steps: 1 });
    geometry.translate(0, 0, -thickness / 2);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    for (let vertex = 0; vertex < uv.count; vertex++) {
        if (Math.abs(normal.getY(vertex)) > 0.5) uv.setXY(vertex, position.getX(vertex) + 0.5, position.getZ(vertex) + 0.5);
        else uv.setXY(vertex, 0.99, 0.5);
    }
    geometry.clearGroups();
    return geometry;
}

function reelGeometry() {
    const outline = new THREE.Shape();
    outline.absarc(0, 0, 0.5, 0, Math.PI * 2, false);
    const center = new THREE.Path();
    center.absarc(0, 0, 0.105, 0, Math.PI * 2, true);
    outline.holes.push(center);
    for (let window = 0; window < 6; window++) {
        const angle = window * Math.PI / 3;
        const hole = new THREE.Path();
        hole.absarc(Math.cos(angle) * 0.305, Math.sin(angle) * 0.305, 0.096, 0, Math.PI * 2, true);
        outline.holes.push(hole);
    }
    return extrudedDisc(outline, DIMENSIONS.reel[1]);
}

export function createMenuPropGeometry(model) {
    const kind = kindOf(model);
    if (kind === 'cassette') return cassetteGeometry();
    if (kind === 'vinyl') return vinylGeometry();
    if (kind === 'reel') return reelGeometry();
    return null;
}
