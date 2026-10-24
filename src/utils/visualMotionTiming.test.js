import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneDampingAlpha, sceneMotionDelta, sceneTransitionDuration } from './visualMotionTiming.js';

function settle(span, epsilon, duration, seconds, fps) {
    let value = 0;
    for (let i = 0; i < Math.round(seconds * fps); i++) {
        value += (span - value) * sceneDampingAlpha(1 / fps, duration, span, epsilon);
    }
    return value;
}

test('scene duration uses the shared saved range and legacy .6 second default', () => {
    assert.equal(sceneTransitionDuration(), .6);
    assert.equal(sceneTransitionDuration(Number.NaN), .6);
    assert.equal(sceneTransitionDuration(0), .2);
    assert.equal(sceneTransitionDuration(12), 3);
    assert.equal(sceneTransitionDuration(1.7), 1.7);
});

test('normal one-step movement reaches its settle threshold by the saved duration', () => {
    for (const [span, epsilon] of [[1, .0005], [14, .001]]) {
        for (const duration of [.2, .6, 1.7, 3]) {
            assert.ok(span - settle(span, epsilon, duration, duration, 60) <= epsilon * 1.000001);
        }
    }
});

test('vertical stops, horizontal items and menu damping have equal elapsed-time poses across refresh rates', () => {
    for (const [span, epsilon] of [[1, .0005], [14, .001]]) {
        for (const duration of [.2, .6, 1.7, 3]) {
            const baseline = settle(span, epsilon, duration, duration, 60);
            assert.ok(Math.abs(settle(span, epsilon, duration, duration, 30) - baseline) < 1e-12);
            assert.ok(Math.abs(settle(span, epsilon, duration, duration, 120) - baseline) < 1e-12);
        }
    }
});

test('saved duration scales all damped axes proportionately without changing the path', () => {
    for (const [span, epsilon] of [[1, .0005], [14, .001]]) {
        const baseline = settle(span, epsilon, .6, .6, 60);
        for (const duration of [.2, 1.2, 3]) {
            assert.ok(Math.abs(settle(span, epsilon, duration, duration, 60) - baseline) < 1e-12);
        }
    }
});

test('hidden gaps, invalid and negative deltas cannot jump a transition on resume', () => {
    for (const delta of [undefined, Number.NaN, Infinity, -1, 3, 300]) {
        assert.equal(sceneMotionDelta(delta), 0);
        assert.equal(sceneDampingAlpha(delta, .6), 0);
    }
    assert.equal(sceneMotionDelta(0), 0);
    assert.equal(sceneMotionDelta(1 / 30), 1 / 30);
    assert.equal(sceneDampingAlpha(0, .6), 0);
    assert.ok(sceneDampingAlpha(1 / 60, .6) > 0);
});

test('even a four-item jump settles below epsilon before a maximum-duration watchdog', () => {
    let remainder = 56;
    for (let i = 0; i < 4 * 60; i++) remainder *= 1 - sceneDampingAlpha(1 / 60, 3, 14, .001);
    assert.ok(remainder < .001);
});
