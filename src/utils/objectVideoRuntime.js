import * as THREE from 'three';
import { createObjectVideoCache } from './objectVideoCache';

const PAUSED_KEY = 'muvs:artwork-motion:paused';
const listeners = new Set();
const reducedMotion = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
let removeEnvironmentListeners;
let manuallyPaused = false;
try { manuallyPaused = sessionStorage.getItem(PAUSED_KEY) === 'true'; } catch { /* Optional preference storage. */ }

// Primitive snapshots stay stable between changes, as useSyncExternalStore requires.
export const getArtworkMotionSnapshot = () => (
    (manuallyPaused ? 1 : 0)
    | (typeof document !== 'undefined' && document.visibilityState === 'hidden' ? 2 : 0)
    | (reducedMotion?.matches ? 4 : 0)
    | (typeof navigator !== 'undefined' && navigator.connection?.saveData ? 8 : 0)
);

export const objectVideoCache = createObjectVideoCache({
    canPlay: () => getArtworkMotionSnapshot() === 0,
    createVideo: () => {
        const video = document.createElement('video');
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.loop = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';
        video.disableRemotePlayback = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        return video;
    },
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
        document.addEventListener('visibilitychange', notify);
        reducedMotion?.addEventListener('change', notify);
        connection?.addEventListener?.('change', notify);
        removeEnvironmentListeners = () => {
            document.removeEventListener('visibilitychange', notify);
            reducedMotion?.removeEventListener('change', notify);
            connection?.removeEventListener?.('change', notify);
        };
    }
    return () => {
        listeners.delete(listener);
        if (!listeners.size) { removeEnvironmentListeners?.(); removeEnvironmentListeners = null; }
    };
};

export const setArtworkMotionPaused = (paused) => {
    manuallyPaused = Boolean(paused);
    try { sessionStorage.setItem(PAUSED_KEY, String(manuallyPaused)); } catch { /* Optional preference storage. */ }
    notify();
};
