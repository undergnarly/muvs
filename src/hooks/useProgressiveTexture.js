import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

const DEFAULT_FALLBACK = '/images/logo.png';
const textureLoader = new THREE.TextureLoader();
const textureRecords = new Map();
const imagePreloads = new Map();

const configureTexture = (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return texture;
};

const cachedTexture = (url) => textureRecords.get(url)?.texture || null;

const loadTexture = (url) => {
    if (!url) return Promise.reject(new Error('Missing texture URL'));
    const existing = textureRecords.get(url);
    if (existing?.texture) return Promise.resolve(existing.texture);
    if (existing?.promise) return existing.promise;

    const record = { texture: null, promise: null };
    record.promise = new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                record.texture = configureTexture(texture);
                resolve(record.texture);
            },
            undefined,
            (error) => {
                textureRecords.delete(url);
                reject(error);
            },
        );
    });
    textureRecords.set(url, record);
    return record.promise;
};

export const imagePreviewUrl = (source, width = 192, quality = 35) => {
    if (!source || /^(?:data:|blob:|https?:)/i.test(source)) return source;
    const pathname = source.split(/[?#]/, 1)[0];
    if (!/^\/(?:uploads|images)\//.test(pathname)) return source;
    if (!/\.(?:avif|gif|jpe?g|png|webp)$/i.test(pathname)) return source;
    return `/api/image-preview?src=${encodeURIComponent(pathname)}&w=${width}&q=${quality}`;
};

export const preloadImage = (source, priority = 'low') => {
    if (!source || typeof Image === 'undefined') return Promise.resolve(false);
    if (imagePreloads.has(source)) return imagePreloads.get(source);

    const promise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.fetchPriority = priority;
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = source;
    });
    imagePreloads.set(source, promise);
    return promise;
};

export const useProgressiveTexture = (source, {
    loadFull = true,
    usePreview = true,
    previewWidth = 192,
    previewQuality = 35,
    fallback = DEFAULT_FALLBACK,
} = {}) => {
    const fullUrl = source || fallback;
    const previewUrl = useMemo(
        () => (usePreview ? imagePreviewUrl(fullUrl, previewWidth, previewQuality) : fullUrl),
        [fullUrl, previewQuality, previewWidth, usePreview],
    );
    const initialTexture = cachedTexture(fullUrl)
        || cachedTexture(previewUrl)
        || cachedTexture(fallback);
    const [loaded, setLoaded] = useState({ source: fullUrl, texture: initialTexture });
    const texture = loaded.source === fullUrl
        ? loaded.texture
        : (cachedTexture(fullUrl) || cachedTexture(previewUrl) || null);

    useEffect(() => {
        let cancelled = false;
        let fullApplied = false;
        const apply = (nextTexture) => {
            if (!cancelled) setLoaded({ source: fullUrl, texture: nextTexture });
        };
        const applyFallback = () => {
            if (fullUrl === fallback) return;
            loadTexture(fallback).then(apply).catch(() => {});
        };
        const handleFullError = () => {
            const previewTexture = cachedTexture(previewUrl);
            if (previewTexture && previewUrl !== fullUrl) apply(previewTexture);
            else applyFallback();
        };

        if (previewUrl && previewUrl !== fullUrl) {
            loadTexture(previewUrl)
                .then((nextTexture) => {
                    if (!fullApplied && !cachedTexture(fullUrl)) apply(nextTexture);
                })
                .catch(() => {
                    if (!loadFull) loadTexture(fullUrl).then(apply).catch(applyFallback);
                });
        }

        if (loadFull || previewUrl === fullUrl) {
            loadTexture(fullUrl)
                .then((nextTexture) => {
                    fullApplied = true;
                    apply(nextTexture);
                })
                .catch(handleFullError);
        }

        return () => { cancelled = true; };
    }, [fallback, fullUrl, loadFull, previewUrl]);

    return texture;
};
