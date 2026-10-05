import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshStandardMaterial } from 'three';
import { applyMenuPropOpacity, createMenuPropSurface, menuPropPatinaNoise, menuPropVinylGrooves } from './menuPropSurface.js';

test('code-native maps are compact opaque flat surfaces with deterministic variants', () => {
    for (const kind of ['cassette', 'vinyl', 'reel']) {
        const first = createMenuPropSurface({ kind, variant: 0 });
        assert.equal(first.width, kind === 'cassette' ? 384 : 128);
        assert.equal(first.height, kind === 'cassette' ? 256 : 128);
        assert.equal(first.pixels.length, first.width * first.height * 4);
        for (let offset = 3; offset < first.pixels.length; offset += 4) assert.equal(first.pixels[offset], 255);
        assert.deepEqual(createMenuPropSurface({ kind, variant: 0 }), first);
        assert.deepEqual(createMenuPropSurface({ kind, variant: 8 }), first);
        assert.notDeepEqual(createMenuPropSurface({ kind, variant: 1 }).pixels, first.pixels);
    }
    assert.equal(createMenuPropSurface({ kind: 'unknown' }), null);
});

test('all faces and accessories fade uniformly and become opaque depth-writing solids at rest', () => {
    const materials = Array.from({ length: 5 }, () => new MeshStandardMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    materials.push(null);
    for (const opacity of [0.23, 0.67, 1, 1, 0.35, 0]) {
        const versions = materials.slice(0, 5).map((material) => material.version);
        const wasTransparent = materials[0].transparent;
        applyMenuPropOpacity(materials, opacity);
        const transparent = opacity < 0.999;
        for (let i = 0; i < 5; i++) {
            assert.equal(materials[i].opacity, opacity);
            assert.equal(materials[i].transparent, transparent);
            assert.equal(materials[i].depthWrite, !transparent);
            assert.equal(materials[i].version, versions[i] + (wasTransparent !== transparent ? 1 : 0));
        }
    }
    for (const material of materials) material?.dispose();
});

test('patina varies smoothly inside patches and across both lattice boundaries', () => {
    const epsilon = 0.0001;
    for (const seed of [0, 31, 37]) for (let boundary = -9; boundary <= 126; boundary += 9) {
        const y = boundary + 3.7;
        assert.ok(Math.abs(menuPropPatinaNoise(boundary - epsilon, y, seed)
            - menuPropPatinaNoise(boundary + epsilon, y, seed)) < 0.00001);
        assert.ok(Math.abs(menuPropPatinaNoise(y, boundary - epsilon, seed)
            - menuPropPatinaNoise(y, boundary + epsilon, seed)) < 0.00001);
        const value = menuPropPatinaNoise(boundary + 4.5, y, seed);
        assert.ok(value >= 0 && value <= 1);
        assert.notEqual(value, menuPropPatinaNoise(boundary + 2.5, y, seed));
    }
});

test('vinyl grooves are sub-Nyquist and pixel-footprint averaged instead of aliased micro-rings', () => {
    const step = 1 / (128 * 8);
    for (let i = 144; i < 512; i++) {
        const radius = i * step;
        const value = menuPropVinylGrooves(radius);
        assert.ok(Math.abs(value) < 6.3);
        assert.ok(Math.abs(menuPropVinylGrooves(radius + step) - value) < 1.85);
    }
    const frequency = Math.PI * 96;
    const radius = Math.PI / (2 * frequency);
    const footprint = frequency / (2 * 128);
    assert.equal(menuPropVinylGrooves(radius), 8 * Math.sin(footprint) / footprint);
    assert.ok(frequency / (2 * Math.PI) < 128 / 2);
});
