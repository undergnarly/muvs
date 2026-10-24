import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardSeek } from './playerSeek.js';

test('waveform keyboard seeking is bounded, duration-aware and ignores unrelated keys', () => {
    assert.equal(keyboardSeek('ArrowRight', .5, 100), .55);
    assert.equal(keyboardSeek('ArrowDown', .5, 100), .45);
    assert.equal(keyboardSeek('PageUp', .95, 100), 1);
    assert.equal(keyboardSeek('ArrowLeft', .01, 100), 0);
    assert.equal(keyboardSeek('Home', .9, 100), 0);
    assert.equal(keyboardSeek('End', .1, 100), 1);
    assert.equal(keyboardSeek('Escape', .5, 100), null);
    assert.equal(keyboardSeek('ArrowRight', .5, 0), null);
});
