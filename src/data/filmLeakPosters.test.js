import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { FILM_LEAK_POSTERS } from './filmLeakPosters.js';
import { FILM_LEAK_CLIPS } from '../utils/filmLeak.js';

test('every transition clip has a distinct tiny inline WebP frame without another network dependency', () => {
    assert.equal(Object.keys(FILM_LEAK_POSTERS).length, FILM_LEAK_CLIPS.length);
    assert.equal(new Set(Object.values(FILM_LEAK_POSTERS)).size, 4);
    for (const clip of FILM_LEAK_CLIPS) {
        const uri = FILM_LEAK_POSTERS[clip];
        assert.ok(uri.startsWith('data:image/webp;base64,'));
        assert.ok(uri.length < 2000);
        const bytes = Buffer.from(uri.split(',')[1], 'base64');
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    }
});
