import test from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Matrix4, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';
import { createMenuPropGeometry, menuPropDimensions, menuPropHalfHeight, menuPropSupport } from './menuPropGeometry.js';

const close = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`);

test('analog models share explicit normalized physical dimensions and reject unknown shapes', () => {
    assert.deepEqual(menuPropDimensions('cassette'), [1, 0.64, 0.12]);
    assert.deepEqual(menuPropDimensions({ kind: 'vinyl' }), [1, 0.012, 1]);
    assert.deepEqual(menuPropDimensions('reel'), [1, 0.07, 1]);
    assert.equal(menuPropDimensions('unknown'), null);
    assert.equal(menuPropDimensions('constructor'), null);
    assert.equal(createMenuPropGeometry('unknown'), null);
    assert.deepEqual(menuPropSupport(null), { x: 0, y: 0, z: 0 });
    assert.deepEqual(menuPropSupport('cassette', [NaN]), menuPropSupport('cassette'));
});

test('box and extruded discs have real finite bounded volume with single-draw geometry', () => {
    for (const kind of ['cassette', 'vinyl', 'reel']) {
        const geometry = createMenuPropGeometry(kind);
        geometry.computeBoundingBox();
        const extent = geometry.boundingBox.getSize(new Vector3());
        const dimensions = menuPropDimensions(kind);
        close(extent.x, dimensions[0]);
        close(extent.y, dimensions[1]);
        close(extent.z, dimensions[2]);
        const center = geometry.boundingBox.getCenter(new Vector3());
        close(center.length(), 0);
        assert.equal(geometry.groups.length, 0);
        assert.ok((geometry.index?.count || geometry.getAttribute('position').count) / 3 < 1400);
        for (const name of ['position', 'normal', 'uv']) {
            for (const value of geometry.getAttribute(name).array) assert.ok(Number.isFinite(value));
        }
        for (const value of geometry.getAttribute('uv').array) assert.ok(value >= 0 && value <= 1);
        geometry.dispose();
    }
});

test('cassette six-face UV atlas uses separate flat side/front/back maps', () => {
    const geometry = createMenuPropGeometry('cassette');
    const uv = geometry.getAttribute('uv');
    for (let face = 0; face < 6; face++) {
        for (let vertex = face * 4; vertex < face * 4 + 4; vertex++) {
            assert.equal(Math.floor(uv.getX(vertex) * 3), face % 3);
            assert.equal(Math.floor(uv.getY(vertex) * 2), Math.floor(face / 3));
        }
    }
    geometry.dispose();
});

test('support follows actual XYZ rotation and conservatively grounds sampled mesh vertices', () => {
    const rotations = [[0, 0, 0], [-Math.PI / 2, 0, 0.32], [0, -0.22, 0.08],
        [Math.PI / 2, 0, -0.18], [0.27, -0.36, 0.19]];
    for (const kind of ['cassette', 'vinyl', 'reel']) for (const rotation of rotations) {
        const support = menuPropSupport({ kind }, rotation);
        const matrix = new Matrix4().makeRotationFromEuler(new Euler(...rotation, 'XYZ'));
        const geometry = createMenuPropGeometry(kind);
        const positions = geometry.getAttribute('position');
        const point = new Vector3();
        let lowest = Infinity;
        for (let vertex = 0; vertex < positions.count; vertex++) {
            point.fromBufferAttribute(positions, vertex).applyMatrix4(matrix);
            lowest = Math.min(lowest, point.y);
        }
        assert.ok(lowest >= support.y - 1e-6, `${kind} penetrates its shared support`);
        close(lowest, support.y, kind === 'cassette' ? 1e-6 : 0.0025);
        close(menuPropHalfHeight(kind, rotation), -support.y);
        geometry.dispose();
    }
});

test('flat and standing models have floor-preserving canonical axes', () => {
    close(menuPropHalfHeight('cassette', [-Math.PI / 2, 0, 0.8]), 0.06);
    close(menuPropHalfHeight('cassette', [0, -0.3, 0]), 0.32);
    for (const kind of ['vinyl', 'reel']) {
        close(menuPropHalfHeight(kind, [0, 0.45, 0]), menuPropDimensions(kind)[1] / 2);
        close(menuPropHalfHeight(kind, [Math.PI / 2, 0, -0.45]), 0.5);
    }
});

test('vinyl spindle and reel windows are real holes rather than texture-painted cutouts', () => {
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const ray = new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0));
    for (const kind of ['vinyl', 'reel']) {
        const geometry = createMenuPropGeometry(kind);
        const mesh = new Mesh(geometry, material);
        mesh.updateMatrixWorld();
        assert.equal(ray.intersectObject(mesh).length, 0);
        ray.ray.origin.set(0.45, 1, 0);
        assert.ok(ray.intersectObject(mesh).length > 0);
        if (kind === 'reel') {
            for (let window = 0; window < 6; window++) {
                const angle = window * Math.PI / 3;
                ray.ray.origin.set(Math.cos(angle) * 0.305, 1, Math.sin(angle) * 0.305);
                assert.equal(ray.intersectObject(mesh).length, 0);
            }
        }
        ray.ray.origin.set(0, 1, 0);
        geometry.dispose();
    }
    material.dispose();
});
