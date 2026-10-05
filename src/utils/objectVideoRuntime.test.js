import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const eventTarget = (properties = {}) => {
    const events = new Map();
    return {
        ...properties,
        events,
        addEventListener(name, listener) {
            if (!events.has(name)) events.set(name, new Set());
            events.get(name).add(listener);
        },
        removeEventListener(name, listener) { events.get(name)?.delete(listener); },
        emit(name, event = {}) { events.get(name)?.forEach((listener) => listener(event)); },
        count(name) { return events.get(name)?.size || 0; },
    };
};
const reducedMotion = eventTarget({ matches: false });
const connection = eventTarget({ saveData: false });
let drawFails = false;
let pixelAlpha = 255;
let frameDraws = 0;
const frameContext = {
    clearRect() {},
    drawImage() { frameDraws += 1; if (drawFails) throw new Error('Frame unavailable'); },
    getImageData: () => ({ data: [255, 255, 255, pixelAlpha] }),
};
const fakeDocument = eventTarget({
    visibilityState: 'visible',
    createElement(name) {
        if (name === 'canvas') return { width: 0, height: 0, getContext: () => frameContext };
        assert.equal(name, 'video');
        return { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
    },
});
let storageReads = 0;
const savedGlobals = new Map();
for (const [name, value] of Object.entries({
    window: { matchMedia: () => reducedMotion, PointerEvent: function PointerEvent() {} },
    document: fakeDocument,
    navigator: { connection },
    sessionStorage: { getItem: () => { storageReads += 1; return 'true'; } },
})) {
    savedGlobals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
}
after(() => {
    for (const [name, descriptor] of savedGlobals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
    }
});

const { createArtworkVideo, getArtworkMotionSnapshot, objectVideoCache, subscribeArtworkMotion, verifyArtworkVideoFrame } = await import('./objectVideoRuntime.js');

test('legacy session pause is ignored while real environment gates remain', () => {
    assert.equal(storageReads, 0);
    assert.equal(getArtworkMotionSnapshot(), 0);
    reducedMotion.matches = true;
    assert.equal(getArtworkMotionSnapshot(), 4);
    connection.saveData = true;
    fakeDocument.visibilityState = 'hidden';
    assert.equal(getArtworkMotionSnapshot(), 14);
    reducedMotion.matches = false;
    connection.saveData = false;
    fakeDocument.visibilityState = 'visible';
    assert.equal(getArtworkMotionSnapshot(), 0);
});

test('mobile video is muted, inline and preloaded, with playback exclusively cache-managed', () => {
    const video = createArtworkVideo();
    assert.equal(video.muted, true);
    assert.equal(video.defaultMuted, true);
    assert.equal(video.playsInline, true);
    assert.equal(video.loop, true);
    assert.equal(video.preload, 'auto');
    assert.equal(video.autoplay, false);
    assert.ok(Object.hasOwn(video.attributes, 'playsinline'));
    assert.ok(Object.hasOwn(video.attributes, 'webkit-playsinline'));
    assert.ok(Object.hasOwn(video.attributes, 'muted'));
});

test('paused-frame verification requires real decoded pixels, not metadata or a successful empty draw', () => {
    const video = { readyState: 1, videoWidth: 720, videoHeight: 720, seeking: false };
    assert.equal(verifyArtworkVideoFrame(video), false);
    assert.equal(frameDraws, 0);
    video.readyState = 2;
    video.seeking = true;
    assert.equal(verifyArtworkVideoFrame(video), false);
    assert.equal(frameDraws, 0);
    video.seeking = false;
    pixelAlpha = 0;
    assert.equal(verifyArtworkVideoFrame(video), false);
    pixelAlpha = 255;
    assert.equal(verifyArtworkVideoFrame(video), true);
    drawFails = true;
    assert.equal(verifyArtworkVideoFrame(video), false);
    drawFails = false;
});

test('splash preloads own temporary environment watchers before Canvas subscribers exist', async () => {
    connection.saveData = true;
    assert.equal(fakeDocument.count('visibilitychange'), 0);
    const first = objectVideoCache.preload({ videoSrc: '/warm-one.mp4' });
    const second = objectVideoCache.preload({ videoSrc: '/warm-two.mp4' });
    assert.equal(fakeDocument.count('visibilitychange'), 1);
    assert.equal(connection.count('change'), 1);
    assert.equal((await first).status, 'skipped');
    assert.equal((await second).status, 'skipped');
    assert.equal(fakeDocument.count('visibilitychange'), 0);
    assert.equal(connection.count('change'), 0);
    connection.saveData = false;
});

test('shared listeners retry on trusted interaction or visible return only and clean up in StrictMode', () => {
    let retries = 0;
    const recoveryOptions = [];
    let refreshes = 0;
    let notifications = 0;
    const retryBlocked = objectVideoCache.retryBlocked;
    const refresh = objectVideoCache.refresh;
    objectVideoCache.retryBlocked = (options) => { retries += 1; recoveryOptions.push(options); };
    objectVideoCache.refresh = () => { refreshes += 1; };
    const first = subscribeArtworkMotion(() => { notifications += 1; });
    const second = subscribeArtworkMotion(() => { notifications += 1; });
    assert.equal(fakeDocument.count('pointerup'), 1);
    assert.equal(fakeDocument.count('touchend'), 0);
    fakeDocument.emit('pointerup', { isTrusted: false });
    fakeDocument.emit('keydown', { isTrusted: true, repeat: true });
    assert.equal(retries, 0);
    fakeDocument.emit('pointerup', { isTrusted: true });
    assert.equal(retries, 1);
    assert.deepEqual(recoveryOptions, [{ userGesture: true }]);
    fakeDocument.visibilityState = 'hidden';
    fakeDocument.emit('visibilitychange');
    assert.equal(retries, 1);
    assert.equal(refreshes, 1);
    fakeDocument.visibilityState = 'visible';
    fakeDocument.emit('visibilitychange');
    assert.equal(retries, 2);
    assert.deepEqual(recoveryOptions, [{ userGesture: true }, undefined]);
    assert.equal(notifications, 4);
    first();
    assert.equal(fakeDocument.count('pointerup'), 1);
    second();
    assert.equal(fakeDocument.count('pointerup'), 0);
    assert.equal(fakeDocument.count('visibilitychange'), 0);
    assert.equal(reducedMotion.count('change'), 0);
    assert.equal(connection.count('change'), 0);
    const remount = subscribeArtworkMotion(() => {});
    assert.equal(fakeDocument.count('pointerup'), 1);
    remount();
    objectVideoCache.retryBlocked = retryBlocked;
    objectVideoCache.refresh = refresh;
});

test('older touch browsers receive recovery without depending on PointerEvent', () => {
    window.PointerEvent = undefined;
    const unsubscribe = subscribeArtworkMotion(() => {});
    assert.equal(fakeDocument.count('touchend'), 1);
    assert.equal(fakeDocument.count('mouseup'), 1);
    assert.equal(fakeDocument.count('pointerup'), 0);
    unsubscribe();
    assert.equal(fakeDocument.count('touchend'), 0);
    assert.equal(fakeDocument.count('mouseup'), 0);
});
