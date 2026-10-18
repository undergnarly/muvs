import test from 'node:test';
import assert from 'node:assert/strict';
import { createListeningMeter, listeningSession } from './dubplatesListening.js';

function fixture(duration = 100) {
    let now = 0;
    const listens = [];
    const meter = createListeningMeter({ now: () => now, onListen: id => listens.push(id) });
    const audio = { currentTime: 0, paused: false, ended: false, seeking: false, readyState: 4, playbackRate: 1 };
    meter.select({ id: 'a', duration }); meter.sample(audio);
    return { meter, audio, listens, advance: (seconds, position = seconds) => { now += seconds * 1000; audio.currentTime += position; meter.sample(audio); } };
}

test('only thirty real audible seconds qualifies a normal track once, across pause and reselection', () => {
    const s = fixture();
    for (let i = 0; i < 29; i++) s.advance(1);
    assert.deepEqual(s.listens, []); s.advance(1); assert.deepEqual(s.listens, ['a']);
    s.meter.suspend(); s.advance(1); s.advance(1);
    s.meter.select({ id: 'a', duration: 100 }); s.advance(1); s.advance(1);
    assert.deepEqual(s.listens, ['a']);
});

test('short track needs half its duration; invalid duration never qualifies', () => {
    const s = fixture(8); for (let i = 0; i < 3; i++) s.advance(1);
    assert.deepEqual(s.listens, []); s.advance(1); assert.deepEqual(s.listens, ['a']);
    for (const duration of [0, NaN, null]) {
        const bad = fixture(duration); for (let i = 0; i < 40; i++) bad.advance(1);
        assert.deepEqual(bad.listens, []);
    }
});

test('seek jumps, pause, waiting, ended and seeking cannot create listens', () => {
    const s = fixture(); s.advance(1, 80); assert.deepEqual(s.listens, []);
    for (const [field, value] of [['paused', true], ['readyState', 2], ['ended', true], ['seeking', true]]) {
        const p = fixture(); p.audio[field] = value; for (let i = 0; i < 40; i++) p.advance(1);
        assert.deepEqual(p.listens, []);
    }
    const stalled = fixture(); stalled.advance(60, 60); assert.deepEqual(stalled.listens, []);
});

test('switching tracks isolates accumulated time and a suspended sample never counts the intervening gap', () => {
    const s = fixture(20); for (let i = 0; i < 9; i++) s.advance(1);
    s.meter.select({ id: 'b', duration: 20 }); s.advance(1); s.advance(1);
    assert.deepEqual(s.listens, []);
    s.meter.select({ id: 'a', duration: 20 }); s.meter.suspend(); s.advance(100, 0); s.advance(1);
    assert.deepEqual(s.listens, ['a']);
});

test('session identifier reuses only a valid random token and tolerates unavailable storage', () => {
    let value;
    const storage = { getItem: () => value, setItem: (_, next) => { value = next; } };
    const random = { getRandomValues: bytes => { bytes.fill(9); return bytes; } };
    assert.equal(listeningSession(storage, random), '09'.repeat(16));
    assert.equal(listeningSession(storage, { getRandomValues: () => { throw new Error('should reuse'); } }), value);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    assert.equal(listeningSession(blocked, random), '09'.repeat(16));
    assert.equal(listeningSession(null, null), null);
});
