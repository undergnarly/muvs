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
const fakeDocument = eventTarget({
    visibilityState: 'visible',
    createElement(name) {
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

const { createArtworkVideo, getArtworkMotionSnapshot, objectVideoCache, subscribeArtworkMotion } = await import('./objectVideoRuntime.js');

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

test('shared listeners retry on trusted interaction or visible return only and clean up in StrictMode', () => {
    let retries = 0;
    let refreshes = 0;
    let notifications = 0;
    const retryBlocked = objectVideoCache.retryBlocked;
    const refresh = objectVideoCache.refresh;
    objectVideoCache.retryBlocked = () => { retries += 1; };
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
    fakeDocument.visibilityState = 'hidden';
    fakeDocument.emit('visibilitychange');
    assert.equal(retries, 1);
    assert.equal(refreshes, 1);
    fakeDocument.visibilityState = 'visible';
    fakeDocument.emit('visibilitychange');
    assert.equal(retries, 2);
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
