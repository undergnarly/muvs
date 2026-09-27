import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_FILTERS, filterTracks, formatTime, waveformBars } from './dubplates.js';

const tracks = [
    { id: 'a', title: 'Shanti', artist: 'MUVS', type: 'dubplate', genre: 'Dub', releaseTitle: 'Veiled', bpm: 140, releaseDate: '2026-09-01' },
    { id: 'b', title: 'Veiled', artist: 'Guest', type: 'release', genre: 'Garage', releaseTitle: 'Veiled', bpm: 130, releaseDate: '2026-01-01' },
    { id: 'c', title: 'Untitled', artist: 'MUVS', type: 'dubplate', genre: 'Dub', releaseTitle: '', bpm: null, createdAt: '2026-03-01' },
];
const filter = (changes) => filterTracks(tracks, { ...INITIAL_FILTERS, ...changes }).map(({ id }) => id);
test('search matches title, artist and EP, ignoring case/outer whitespace', () => {
    assert.deepEqual(filter({ query: ' VEILED ' }), ['a', 'b']);
    assert.deepEqual(filter({ query: 'muvs' }), ['a', 'c']);
});
test('all filters combine and unknown BPM is excluded by a range', () => {
    assert.deepEqual(filter({ type: 'dubplate', genre: 'Dub', release: 'Veiled', bpmMin: '135', bpmMax: '145' }), ['a']);
    assert.deepEqual(filter({ bpmMax: '135' }), ['b']);
    assert.deepEqual(filter({ bpmMin: '150', bpmMax: '100' }), []);
});
test('sort dates and BPM consistently; unknown BPM always last; input not mutated', () => {
    assert.deepEqual(filter({ sort: 'oldest' }), ['b', 'c', 'a']);
    assert.deepEqual(filter({ sort: 'bpm-asc' }), ['b', 'a', 'c']);
    assert.deepEqual(filter({ sort: 'bpm-desc' }), ['a', 'b', 'c']);
    assert.deepEqual(tracks.map(({ id }) => id), ['a', 'b', 'c']);
});
test('time and real waveform peaks are bounded, no synthetic waveform', () => {
    assert.equal(formatTime(NaN), '0:00');
    assert.equal(formatTime(3671.9), '61:11');
    assert.deepEqual(waveformBars([]), []);
    assert.deepEqual(waveformBars([0, .5, .2, 1], 2), [.5, 1]);
    assert.deepEqual(waveformBars([-1, 3, NaN]), [0, 1, 0]);
});
