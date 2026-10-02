import test from 'node:test';
import assert from 'node:assert/strict';
import { createObjectVideoCache } from './objectVideoCache.js';
import { getObjectLoop, isObjectPosterReady, OBJECT_LOOPS } from '../data/objectLoops.js';

const spec = (name = 'music') => ({ videoSrc: `/videos/objects/${name}.mp4`, alphaMaskSrc: `/videos/objects/${name}-alpha.png`, width: 720, height: 720 });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
};

function harness({ alpha, play } = {}) {
    const videos = [];
    const textures = [];
    const masks = [];
    const timers = new Map();
    const events = [];
    let timerId = 0;
    let allowed = true;
    const cache = createObjectVideoCache({
        createVideo: () => {
            const listeners = new Map();
            const video = {
                src: '', paused: true, readyState: 0, videoWidth: 720, videoHeight: 720,
                addEventListener(name, fn) { listeners.set(name, fn); },
                removeEventListener(name) { listeners.delete(name); },
                emit(name) { listeners.get(name)?.(); },
                listenerCount: () => listeners.size,
                load() { events.push(['load', this.src]); },
                play() { this.paused = false; events.push(['play', this.src]); return play ? play(this) : Promise.resolve(); },
                pause() { this.paused = true; events.push(['pause', this.src]); },
                removeAttribute(name) { if (name === 'src') this.src = ''; },
            };
            videos.push(video);
            return video;
        },
        createTexture: () => {
            const texture = { disposed: false, dispose() { this.disposed = true; } };
            textures.push(texture);
            return texture;
        },
        loadAlpha: () => {
            const mask = { disposed: false, dispose() { this.disposed = true; } };
            masks.push(mask);
            return alpha ? alpha(mask) : Promise.resolve(mask);
        },
        canPlay: () => allowed,
        schedule: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
        cancel: (id) => timers.delete(id),
    });
    return {
        cache, videos, textures, masks, events,
        policy: (value) => { allowed = value; cache.refresh(); },
        ready: (index = 0) => { videos[index].readyState = 2; videos[index].emit('loadeddata'); },
        timers: (delay) => {
            [...timers].filter(([, timer]) => timer.delay === delay).forEach(([id, timer]) => { timers.delete(id); timer.fn(); });
        },
    };
}

test('unapproved posters stay static and exact paths do not match variations', () => {
    assert.equal(getObjectLoop('/not-approved.webp'), null);
    for (const path of Object.keys(OBJECT_LOOPS)) {
        assert.equal(getObjectLoop(path), OBJECT_LOOPS[path]);
        assert.equal(getObjectLoop(`${path}?changed=1`), null);
        assert.equal(getObjectLoop(`https://muvs.dev${path}`), null);
    }
});

test('poster gate rejects cached fallback images but accepts the correct original or preview', () => {
    const poster = '/images/menu/music2.webp';
    assert.equal(isObjectPosterReady(null, poster), false);
    assert.equal(isObjectPosterReady({ image: { src: 'https://muvs.dev/images/logo.png' } }, poster), false);
    assert.equal(isObjectPosterReady({ image: { src: `https://muvs.dev${poster}` } }, poster), true);
    assert.equal(isObjectPosterReady({ image: { src: `/api/image-preview?src=${encodeURIComponent(poster)}&w=192` } }, poster), true);
});

test('acquiring duplicate meshes is lazy; one URL creates one decoder and texture', async () => {
    const h = harness();
    const first = h.cache.acquire(spec());
    const duplicate = h.cache.acquire(spec());
    assert.equal(h.videos.length, 0);
    first.setActive(true);
    duplicate.setActive(true);
    h.ready();
    await flush();
    assert.equal(h.videos.length, 1);
    assert.equal(h.textures.length, 1);
    assert.equal(first.getSnapshot().texture, duplicate.getSnapshot().texture);
    assert.equal(first.getSnapshot().status, 'ready');
    duplicate.setActive(false);
    duplicate.release();
    assert.equal(h.videos[0].paused, false);
    first.release();
    assert.equal(h.videos[0].paused, true);
});

test('StrictMode release/reacquire reuses live resources; final release disposes once', async () => {
    const h = harness();
    const first = h.cache.acquire(spec());
    first.setActive(true);
    h.ready();
    await flush();
    first.release();
    first.release();
    const second = h.cache.acquire(spec());
    second.setActive(true);
    await flush();
    h.timers(1000);
    assert.equal(h.videos.length, 1);
    assert.equal(h.textures[0].disposed, false);
    assert.equal(second.getSnapshot().status, 'ready');
    second.release();
    h.timers(1000);
    assert.equal(h.textures[0].disposed, true);
    assert.equal(h.masks[0].disposed, true);
    assert.equal(h.videos[0].src, '');
    assert.equal(h.videos[0].listenerCount(), 0);
    assert.equal(h.cache.getStatus(spec().videoSrc), 'idle');
});

test('new selected URL pauses the previous source before starting, at most one plays', async () => {
    const h = harness();
    const music = h.cache.acquire(spec('music'));
    const code = h.cache.acquire(spec('code'));
    music.setActive(true);
    await flush();
    code.setActive(true);
    await flush();
    assert.equal(h.videos.filter((video) => !video.paused).length, 1);
    assert.equal(h.videos[0].paused, true);
    const pauseIndex = h.events.findIndex(([name, url]) => name === 'pause' && url === spec('music').videoSrc);
    const nextPlayIndex = h.events.findIndex(([name, url]) => name === 'play' && url === spec('code').videoSrc);
    assert.ok(pauseIndex >= 0 && pauseIndex < nextPlayIndex);
});

test('hidden/reduced-motion/save-data/pause gate blocks initial network and resumes only selection', async () => {
    const h = harness();
    h.policy(false);
    const music = h.cache.acquire(spec('music'));
    const code = h.cache.acquire(spec('code'));
    music.setActive(true);
    code.setActive(true);
    assert.equal(h.videos.length, 0);
    h.policy(true);
    assert.equal(h.videos.length, 1);
    assert.equal(h.videos[0].src, spec('code').videoSrc);
    await flush();
    h.policy(false);
    assert.equal(h.videos[0].paused, true);
    h.policy(true);
    await flush();
    assert.equal(h.videos.length, 1);
    assert.equal(h.videos[0].paused, false);
});

test('ready requires video frame, decoded alpha and successful play together', async () => {
    const pendingAlpha = deferred();
    const h = harness({ alpha: () => pendingAlpha.promise });
    const lease = h.cache.acquire(spec());
    lease.setActive(true);
    h.ready();
    await flush();
    assert.equal(lease.getSnapshot().status, 'loading');
    assert.equal(lease.getSnapshot().texture, null);
    pendingAlpha.resolve(h.masks[0]);
    await flush();
    assert.equal(lease.getSnapshot().status, 'ready');
    assert.equal(lease.getSnapshot().alphaMap, h.masks[0]);
});

test('background/paused loading does not expire while inactive; resume rearms timeout', async () => {
    const pendingAlpha = deferred();
    const h = harness({ alpha: () => pendingAlpha.promise });
    const lease = h.cache.acquire(spec());
    lease.setActive(true);
    await flush();
    h.policy(false);
    h.timers(15000);
    assert.equal(lease.getSnapshot().status, 'loading');
    h.policy(true);
    h.timers(15000);
    assert.equal(lease.getSnapshot().status, 'error');
});

test('autoplay rejection falls back and never loops retries; explicit retry is allowed', async () => {
    const h = harness({ play: () => Promise.reject(new Error('NotAllowedError')) });
    const lease = h.cache.acquire(spec());
    lease.setActive(true);
    await flush();
    assert.equal(lease.getSnapshot().status, 'error');
    assert.equal(lease.getSnapshot().texture, null);
    assert.equal(h.videos[0].src, '');
    h.cache.refresh();
    lease.setActive(false);
    lease.setActive(true);
    assert.equal(h.videos.length, 1);
    h.cache.retry(spec().videoSrc);
    assert.equal(h.videos.length, 2);
    await flush();
});

test('late play failure after switching cannot fail the new source', async () => {
    const firstPlay = deferred();
    const h = harness({ play: (video) => video.src.includes('music') ? firstPlay.promise : Promise.resolve() });
    const music = h.cache.acquire(spec('music'));
    const code = h.cache.acquire(spec('code'));
    music.setActive(true);
    code.setActive(true);
    h.ready(1);
    firstPlay.reject(new Error('AbortError'));
    await flush();
    assert.equal(code.getSnapshot().status, 'ready');
    assert.notEqual(music.getSnapshot().status, 'error');
    assert.equal(h.videos[0].paused, true);
});

test('late alpha after final release is disposed, with no dead-owner notification', async () => {
    const pendingAlpha = deferred();
    const h = harness({ alpha: () => pendingAlpha.promise });
    let notifications = 0;
    const lease = h.cache.acquire(spec(), () => { notifications += 1; });
    lease.setActive(true);
    lease.release();
    h.timers(1000);
    const before = notifications;
    h.ready();
    pendingAlpha.resolve(h.masks[0]);
    await flush();
    assert.equal(notifications, before);
    assert.equal(h.masks[0].disposed, true);
});

test('decode error, alpha failure, wrong dimensions and load timeout all keep the poster', async () => {
    for (const failure of ['decode', 'alpha', 'dimensions', 'timeout']) {
        const h = harness(failure === 'alpha' ? { alpha: () => Promise.reject(new Error('missing alpha')) } : {});
        const lease = h.cache.acquire(spec());
        lease.setActive(true);
        if (failure === 'decode') h.videos[0].emit('error');
        if (failure === 'dimensions') { h.videos[0].videoWidth = 640; h.ready(); }
        if (failure === 'timeout') h.timers(15000);
        await flush();
        assert.equal(lease.getSnapshot().status, 'error', failure);
        assert.equal(lease.getSnapshot().texture, null, failure);
        assert.equal(h.videos[0].paused, true, failure);
    }
});
