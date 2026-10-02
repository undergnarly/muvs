import * as THREE from 'three';
import { createObjectVideoCache } from './objectVideoCache.js';

const listeners = new Set();
const reducedMotion = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
let removeEnvironmentListeners;

// Primitive snapshots stay stable between changes, as useSyncExternalStore requires.
// The removed manual-pause preference is intentionally never read from storage.
export const getArtworkMotionSnapshot = () => (
    (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 2 : 0)
    | (reducedMotion?.matches ? 4 : 0)
    | (typeof navigator !== 'undefined' && navigator.connection?.saveData ? 8 : 0)
);

export function createArtworkVideo() {
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    // Playback is automatic but cache-managed. The autoplay attribute would
    // let a merely preloaded/offscreen source bypass the one-playing limit.
    video.autoplay = false;
    video.loop = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.disableRemotePlayback = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    return video;
}

export const objectVideoCache = createObjectVideoCache({
    canPlay: () => getArtworkMotionSnapshot() === 0,
    createVideo: createArtworkVideo,
    createTexture: (video) => {
        const texture = new THREE.VideoTexture(video);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        return texture;
    },
    loadAlpha: (spec) => new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(spec.alphaMaskSrc, (texture) => {
            const image = texture.image;
            if ((image.naturalWidth || image.width) !== spec.width || (image.naturalHeight || image.height) !== spec.height) {
                texture.dispose();
                reject(new Error('Artwork alpha dimensions differ from video'));
                return;
            }
            // alphaMap samples GREEN, not the file's alpha channel. The sidecar
            // is an opaque grayscale image extracted from the original alpha.
            texture.colorSpace = THREE.NoColorSpace;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            resolve(texture);
        }, undefined, reject);
    }),
});

const notify = () => {
    // Do this synchronously: background tabs may suspend React and R3F frames.
    objectVideoCache.refresh();
    listeners.forEach((listener) => listener());
};

export const subscribeArtworkMotion = (listener) => {
    listeners.add(listener);
    if (!removeEnvironmentListeners && typeof document !== 'undefined') {
        const connection = navigator.connection;
        const onVisible = () => {
            notify();
            if (document.visibilityState === 'visible') objectVideoCache.retryBlocked();
        };
        const onInteraction = (event) => {
            if (event.isTrusted && !event.repeat) objectVideoCache.retryBlocked();
        };
        const interactions = typeof window.PointerEvent === 'function'
            ? ['pointerup', 'keydown'] : ['touchend', 'mouseup', 'keydown'];
        document.addEventListener('visibilitychange', onVisible);
        // Capture keeps recovery working when navigation stops event bubbling.
        // play() is called synchronously inside this trusted event when possible.
        interactions.forEach((name) => document.addEventListener(name, onInteraction, { capture: true, passive: true }));
        reducedMotion?.addEventListener('change', notify);
        connection?.addEventListener?.('change', notify);
        removeEnvironmentListeners = () => {
            document.removeEventListener('visibilitychange', onVisible);
            interactions.forEach((name) => document.removeEventListener(name, onInteraction, true));
            reducedMotion?.removeEventListener('change', notify);
            connection?.removeEventListener?.('change', notify);
        };
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) { removeEnvironmentListeners?.(); removeEnvironmentListeners = null; }
    };
};
