import test from 'node:test';
import assert from 'node:assert/strict';
import { createObjectEntranceTimeline, getObjectEntranceKind } from './objectEntranceTimeline.js';

function harness(options) {
    const timeline = createObjectEntranceTimeline(options);
    let frame = 0;
    return {
        timeline,
        advance: (key, options = {}) => timeline.advance(key, { frame: ++frame, delta: 0.05, eligible: true, ...options }),
    };
}

test('only the three exact approved posters receive entrances', () => {
    assert.equal(getObjectEntranceKind('/images/menu/music2.webp'), 'music');
    assert.equal(getObjectEntranceKind('/images/menu/mixes-trans.webp'), 'mixes');
    assert.equal(getObjectEntranceKind('/images/menu/code2.webp'), 'code');
    assert.equal(getObjectEntranceKind('/images/menu/code2.webp?v=2'), null);
    assert.equal(getObjectEntranceKind('/uploads/1783951707737-ai-agents_trans.webp'), null);
});

test('intro starts only on settled, visible, ready arrival and completes once', () => {
    const { timeline, advance } = harness();
    const token = timeline.select('menu:music', 'music');
    advance('menu:music', { eligible: false });
    assert.equal(timeline.state.phase, 'pending');
    advance('menu:music');
    assert.equal(timeline.state.phase, 'intro');
    assert.equal(timeline.state.elapsed, 0);
    for (let n = 0; n < 49; n += 1) advance('menu:music');
    assert.equal(timeline.state.phase, 'complete');
    assert.equal(timeline.state.elapsed, 2.4);
    timeline.select('menu:music', 'music');
    advance('menu:music');
    assert.equal(timeline.state.phase, 'complete');
    assert.equal(timeline.state.selectionToken, token);
});

test('duplicate physical copies share one clock and wrap cannot reset logical selection', () => {
    const { timeline } = harness();
    const token = timeline.select('menu:music', 'music');
    timeline.advance('menu:music', { frame: 1, delta: 0.05, eligible: true });
    for (let copy = 0; copy < 3; copy += 1) {
        timeline.advance('menu:music', { frame: 2, delta: 0.05, eligible: true });
    }
    assert.equal(timeline.state.elapsed, 0.05);
    assert.equal(timeline.select('menu:music', 'music'), token);
    const oldCopy = {};
    const normalizedCopy = {};
    timeline.sample('menu:music', oldCopy);
    timeline.sample('menu:music', normalizedCopy);
    assert.deepEqual(normalizedCopy, oldCopy);
});

test('unselected copies cannot start or advance the active intro', () => {
    const { timeline, advance } = harness();
    timeline.select('menu:mixes', 'mixes');
    advance('menu:music');
    assert.equal(timeline.state.phase, 'pending');
    advance('menu:mixes', { eligible: false });
    assert.equal(timeline.state.phase, 'pending');
    advance('menu:mixes');
    advance('menu:code');
    assert.equal(timeline.state.elapsed, 0);
});

test('changing selection cancels old mesh immediately; returning creates exactly one fresh occurrence', () => {
    const { timeline, advance } = harness();
    const first = timeline.select('menu:music', 'music');
    advance('menu:music');
    advance('menu:music');
    timeline.select('menu:mixes', 'mixes');
    const oldMesh = { assetsReady: true, mediaStatus: 'ready' };
    timeline.sample('menu:music', oldMesh);
    assert.equal(oldMesh.phase, 'cancelled');
    assert.equal(oldMesh.selectionToken, null);
    assert.equal(oldMesh.assetsReady, true);
    assert.equal(oldMesh.mediaStatus, 'ready');
    const second = timeline.select('menu:music', 'music');
    assert.notEqual(second, first);
    assert.equal(timeline.state.phase, 'pending');
    assert.equal(timeline.state.elapsed, 0);
    assert.equal(timeline.select('menu:music', 'music'), second);
});

test('navigation away cancels without blocking and returning to cover replays', () => {
    const { timeline, advance } = harness();
    const first = timeline.select('section:code:vibe-production', 'code');
    advance('section:code:vibe-production');
    timeline.select(null, null);
    assert.equal(timeline.state.phase, 'cancelled');
    advance('section:code:vibe-production');
    assert.equal(timeline.state.phase, 'cancelled');
    assert.notEqual(timeline.select('section:code:vibe-production', 'code'), first);
    assert.equal(timeline.state.phase, 'pending');
});

test('hidden/offscreen/context loss freezes intro and resume clamps a large delta instead of restarting', () => {
    const { timeline, advance } = harness();
    const token = timeline.select('menu:music', 'music');
    advance('menu:music');
    advance('menu:music');
    const before = timeline.state.elapsed;
    advance('menu:music', { eligible: false, delta: 60 });
    assert.equal(timeline.state.elapsed, before);
    advance('menu:music', { delta: 60 });
    assert.equal(timeline.state.elapsed, before + 0.05);
    assert.equal(timeline.state.selectionToken, token);
    assert.equal(timeline.state.phase, 'intro');
});

test('reduced motion or Save-Data skips pending/in-progress intro without later replay', () => {
    for (const started of [false, true]) {
        const { timeline, advance } = harness();
        timeline.select('menu:code', 'code');
        if (started) advance('menu:code');
        advance('menu:code', { skip: true, eligible: false });
        assert.equal(timeline.state.phase, 'complete');
        advance('menu:code');
        assert.equal(timeline.state.phase, 'complete');
        assert.equal(timeline.state.elapsed, timeline.state.duration);
    }
});

test('Code asset waiting is bounded in visible time and errors immediately choose normal fallback', () => {
    const { timeline, advance } = harness();
    timeline.select('menu:code', 'code');
    for (let n = 0; n < 20; n += 1) advance('menu:code', { mediaStatus: 'loading' });
    assert.equal(timeline.state.phase, 'pending');
    for (let n = 0; n < 100; n += 1) advance('menu:code', { eligible: false, mediaStatus: 'loading' });
    assert.equal(timeline.state.phase, 'pending');
    for (let n = 0; n < 21; n += 1) advance('menu:code', { mediaStatus: 'loading' });
    assert.equal(timeline.state.phase, 'complete');
    timeline.select('other', null);
    timeline.select('menu:code', 'code');
    advance('menu:code', { mediaStatus: 'error' });
    assert.equal(timeline.state.phase, 'complete');
});

test('Code readiness starts from zero rather than consuming asset waiting time', () => {
    const { timeline, advance } = harness();
    timeline.select('menu:code', 'code');
    for (let n = 0; n < 10; n += 1) advance('menu:code', { mediaStatus: 'loading' });
    advance('menu:code');
    assert.equal(timeline.state.phase, 'intro');
    assert.equal(timeline.state.elapsed, 0);
});

test('timeline instances use different restart tokens, avoiding route-remount cache collisions', () => {
    const first = createObjectEntranceTimeline();
    const second = createObjectEntranceTimeline();
    assert.notEqual(first.select('menu:music', 'music'), second.select('menu:music', 'music'));
});
