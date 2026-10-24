import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { phoneTextFitScale } from './phoneTextFit.js';

const bounds = [-4.2, -.4, 4.2, .4];
function fixture(width = 320) {
    const camera = new PerspectiveCamera(56, width / 740, .1, 100);
    camera.position.set(0, 3, 7); camera.lookAt(0, 2.6, 0); camera.updateMatrixWorld();
    const model = new Matrix4().makeTranslation(0, 4.7, -1.55);
    const modelView = new Matrix4().multiplyMatrices(camera.matrixWorldInverse, model);
    const depth = -new Vector3(0, 4.7, -1.55).applyMatrix4(camera.matrixWorldInverse).z;
    return { camera, model, modelView, depth, width };
}

test('actual measured title bounds fit320px and390px safe widths without changing short labels', () => {
    for (const width of [320, 390]) {
        const f = fixture(width);
        const scale = phoneTextFitScale(bounds, f.modelView.elements, f.camera.projectionMatrix.elements[0], f.depth, width);
        assert.ok(scale > 0 && scale < 1);
        const safeWorldWidth = 2 * f.depth / f.camera.projectionMatrix.elements[0] * (width - 32) / width;
        assert.ok(8.4 * scale <= safeWorldWidth + .002);
        assert.equal(phoneTextFitScale([-1, -.2, 1, .2], f.modelView.elements, f.camera.projectionMatrix.elements[0], f.depth, width), 1);
    }
});

test('fitting is not cumulative and ignores horizontal offscreen translations', () => {
    const f = fixture();
    const first = phoneTextFitScale(bounds, f.modelView.elements, f.camera.projectionMatrix.elements[0], f.depth, f.width);
    const scaled = f.model.clone().scale(new Vector3(first, first, first));
    const next = new Matrix4().multiplyMatrices(f.camera.matrixWorldInverse, scaled);
    assert.equal(phoneTextFitScale(bounds, next.elements, f.camera.projectionMatrix.elements[0], f.depth, f.width, first), first);
    const translated = f.modelView.clone(); translated.elements[12] += 56;
    assert.equal(phoneTextFitScale(bounds, translated.elements, f.camera.projectionMatrix.elements[0], f.depth, f.width), first);
});

test('floor Html rectangle uses exact distanceFactor/400 units and finite rotation-safe scale', () => {
    const f = fixture();
    const caption = [-360 * 5 / 800, -60 * 5 / 800, 360 * 5 / 800, 60 * 5 / 800];
    const modelView = f.modelView.clone().multiply(new Matrix4().makeRotationX(-Math.PI / 2 + 34 * Math.PI / 180));
    const scale = phoneTextFitScale(caption, modelView.elements, f.camera.projectionMatrix.elements[0], f.depth, f.width);
    assert.ok(Number.isFinite(scale) && scale > 0 && scale <= 1);
    const nominal = modelView.clone().setPosition(0, 0, -f.depth);
    const projected = [
        new Vector3(caption[0], caption[1], 0), new Vector3(caption[0], caption[3], 0),
        new Vector3(caption[2], caption[1], 0), new Vector3(caption[2], caption[3], 0),
    ].map(point => point.multiplyScalar(scale).applyMatrix4(nominal).applyMatrix4(f.camera.projectionMatrix).x);
    assert.ok(Math.max(...projected) - Math.min(...projected) <= 2 * (f.width - 32) / f.width + 1e-6);
    for (const bad of [null, [NaN, 0, 1, 1]]) assert.equal(phoneTextFitScale(bad, modelView.elements, 1, 5, 320), 1);
    assert.equal(phoneTextFitScale(bounds, modelView.elements, 1, -1, 320), 1);
});
