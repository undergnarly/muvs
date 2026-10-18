import assert from 'node:assert/strict';
import test from 'node:test';
import { activityDate, loudnessLabel, parsePrivateRating, parseTrackTags, sortAdminTracks, stageLabel } from './dubplatesAdminHelpers.js';

test('tag input preserves multi-word genres and normalizes commas, lines and repeats', () => {
    assert.deepEqual(parseTrackTags(' jungle, drum  and bass, JUNGLE\n dub \n, '), ['jungle', 'drum and bass', 'dub']);
    assert.deepEqual(parseTrackTags([' Jungle ', 'jungle', 'Drum and Bass']), ['Jungle', 'Drum and Bass']);
    assert.deepEqual(parseTrackTags(''), []);
});

test('private rating distinguishes an intentional zero from an unset rating', () => {
    assert.equal(parsePrivateRating(''), null);
    assert.equal(parsePrivateRating(null), null);
    assert.equal(parsePrivateRating('0'), 0);
    assert.equal(parsePrivateRating('9.5'), 9.5);
    assert.equal(parsePrivateRating(10), 10);
    for (const invalid of [-1, 11, Infinity, 'not a number']) assert.throws(() => parsePrivateRating(invalid), /0 to 10/);
});

test('LUFS display requires a finite actual measurement and keeps a real zero', () => {
    assert.equal(loudnessLabel({ integratedLufs: 0 }), '0.0 LUFS-I');
    assert.equal(loudnessLabel({ integratedLufs: -9.27 }), '-9.3 LUFS-I');
    assert.equal(loudnessLabel({ integratedLufs: null }), 'Loudness not measured');
    assert.equal(loudnessLabel({ integratedLufs: -Infinity, loudnessStatus: 'unavailable' }), 'Loudness unavailable');
    assert.equal(loudnessLabel({ loudnessStatus: 'processing' }), 'Measuring loudness…');
    assert.equal(loudnessLabel({ loudnessStatus: 'pending' }), 'Loudness not measured');
    assert.equal(loudnessLabel({ loudnessStatus: 'error' }), 'Loudness measurement failed');
});

test('legacy production stage is never inferred and malformed dates remain harmless', () => {
    assert.equal(stageLabel(null), 'Unspecified');
    assert.equal(stageLabel('unknown'), 'Unspecified');
    assert.equal(stageLabel('mastered'), 'Mastered');
    assert.equal(activityDate(null), '—');
    assert.equal(activityDate('broken'), '—');
});

test('admin sorting is stable, nonmutating and ranks zero rating above unset', () => {
    const tracks = [{ id: 'old', title: 'Old', createdAt: '2025', rating: 0 }, { id: 'new', title: 'New', createdAt: '2026', rating: null }];
    const stats = [{ id: 'old', downloads: 4, listens: 1 }, { id: 'new', downloads: 2, listens: 8 }];
    assert.deepEqual(sortAdminTracks(tracks, 'downloads', stats).map((track) => track.id), ['old', 'new']);
    assert.deepEqual(sortAdminTracks(tracks, 'listens', stats).map((track) => track.id), ['new', 'old']);
    assert.deepEqual(sortAdminTracks(tracks, 'rating').map((track) => track.id), ['old', 'new']);
    assert.deepEqual(sortAdminTracks(tracks, 'recent').map((track) => track.id), ['new', 'old']);
    assert.deepEqual(tracks.map((track) => track.id), ['old', 'new']);
});
