import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleEntranceVisuals, writeLidPositions } from './artworkEntranceVisuals.js';
import { CODE_ENTRANCE } from '../data/codeEntrance.js';

test('music drops a small distance, lands before dust, and returns to exact baseline', () => {
    const out = {};
    assert.equal(sampleEntranceVisuals('music', 0, out).offset, 0.105);
    assert.equal(out.dustTime, -0.56);
    assert.equal(out.opacity, 0);
    assert.ok(sampleEntranceVisuals('music', 0.3, out).offset < 0.105);
    assert.equal(sampleEntranceVisuals('music', 0.56, out).offset, 0);
    assert.equal(out.dustTime, 0);
    assert.ok(sampleEntranceVisuals('music', 2.4, out).offset < 1e-10);
});

test('warm reveal and laptop opening settle without flashing or overshoot', () => {
    const out = {};
    assert.equal(sampleEntranceVisuals('mixes', 0, out).glow, 0.8);
    assert.equal(sampleEntranceVisuals('mixes', 2.4, out).glow, 0);
    assert.equal(sampleEntranceVisuals('code', 0, out).lid, 0);
    assert.equal(sampleEntranceVisuals('code', 2.4, out).lid, 1);
    let previous = 0;
    for (let t = 0; t <= 2.4; t += 0.02) {
        const lid = sampleEntranceVisuals('code', t, out).lid;
        assert.ok(lid >= previous && lid <= 1);
        previous = lid;
    }
});

test('lid returns to the exact original pixels and keeps the hinge stationary', () => {
    const output = new Float32Array(12);
    const { hinge, lidBounds: bounds } = CODE_ENTRANCE;
    writeLidPositions(output, bounds, hinge, 4, 4, 1);
    assert.ok(Array.from(output).every(Number.isFinite));
    assert.ok(Math.abs(output[0] - (bounds.left / 1024 - 0.5) * 4) < 1e-7);
    assert.ok(Math.abs(output[1] - (0.5 - bounds.top / 1024) * 4) < 1e-7);
    for (const t of [0, 0.2, 0.5, 1]) {
        writeLidPositions(output, { left: 590, top: 445, width: 0, height: 0 }, hinge, 4, 4, t);
        assert.ok(Math.abs(output[0] - (590 / 1024 - 0.5) * 4) < 1e-7);
        assert.ok(Math.abs(output[1] - (0.5 - 445 / 1024) * 4) < 1e-7);
    }
});
