import React, { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text, useTexture } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import AlbumPlayer from '../media/AlbumPlayer';
import { useData } from '../../context/DataContext';
import { ROUTES } from '../../utils/constants';
import { sanitizeCaptionHtml } from '../../utils/captionRichText';
import { DEVICE_TILT_DEFAULTS, mergeDeviceTiltSettings } from '../../utils/deviceParallax';
import { preloadImage, useProgressiveTexture } from '../../hooks/useProgressiveTexture';
import GyroParallaxLayer from './GyroParallaxLayer';
import {
    RingMenu, HUB_ITEMS, HUB_SPACING, HUB_RETURN_KEY, DEFAULT_HUB,
    hubMod, hubDisplayIndex, hubSmoothstep, hubMenuPose, hubCameraDistance, lerpPose,
} from './RingMenu';
import './HomeNewPage.css';

const stripHtml = (html) =>
    (html || '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&mdash;/g, '—')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

const RELEASE_SPACING = 14;
// Matches body font-family (Urbanist). Same family at multiple weights so
// drei Text renders with the same look as DOM elements.
const FONT_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-500-normal.woff';
const FONT_BOLD = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-700-normal.woff';
const FONT_HANDWRITTEN = '/fonts/yuliana.ttf';
const RELEASE_FONT_OPTIONS = [
    { value: 'urbanist-regular', label: 'Urbanist Regular', url: FONT_REGULAR },
    { value: 'urbanist-bold', label: 'Urbanist Bold', url: FONT_BOLD },
    { value: 'cat-schmalfette', label: 'CAT Schmalfette', url: '/fonts/cat-schmalfette.ttf' },
    { value: 'deutsch-gothic', label: 'Deutsch Gothic', url: '/fonts/deutsch-gothic.otf' },
    { value: 'drei-fraktur', label: 'Drei Fraktur', url: '/fonts/drei-fraktur.ttf' },
    { value: 'yuliana', label: 'Yuliana', url: FONT_HANDWRITTEN },
];

const releaseFontUrl = (value, fallback) => (
    RELEASE_FONT_OPTIONS.find((font) => font.value === value)?.url || fallback
);

const releaseTextSize = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_STOPS = [
    { pos: { x: 0,    y: 3.0,  z: 7.0  }, look: { x: 0,    y:  2.6, z: 0.0  }, fov: 46  },
    { pos: { x: 0,    y: 5.2,  z: 10.3 }, look: { x: 0,    y: -0.2, z: 9.7  }, fov: 113 },
    { pos: { x: -7.6, y: 8.8,  z: 30.0 }, look: { x: -0.7, y:  1.6, z: 19.6 }, fov: 26  },
    { pos: { x: 2.7,  y: 15.4, z: 30.0 }, look: { x: -5.3, y:  0.1, z: 11.4 }, fov: 27  },
];

const DEFAULT_BILLBOARD = {
    coverSize: 3,
    coverY: 0.25,
    titleY: 1.15,
    titleZ: -3,
    titleSize: 0.72,
    titleFont: 'urbanist-bold',
    artistY: 1.6,
    artistZ: -3,
    artistSize: 0.26,
    artistFont: 'urbanist-regular',
};

const DEFAULT_STACK = {
    pos: { x: 0.4, y: -0.05, z: 17.5 },
    boxSize: 0.7,
    gap: 0.04,
};

const DEFAULT_SUPPORT = {
    pos: { x: 0.2, y: 0.1, z: 18.6 },
    fontSize: 0.7,
    metaSize: 0.18,
};

const DEFAULT_TV = {
    pos: { x: 0, y: 2.85, z: 0.05 },
    scale: 4.5,
    screen: { x0: 0.234, x1: 0.712, y0: 0.314, y1: 0.686 },
    iframeShift: { x: 0, y: 0, z: 0 },
    iframeScale: 40,
    playStop0Z: 5.6,
};

const DEFAULT_CODE_CAPTION = {
    pos: { x: 0, y: 0.025, z: -1.5 },
    tilt: 12,
    rotation: 0,
    scale: 5,
    width: 360,
    fontSize: 14,
    lineHeight: 1.25,
    letterSpacing: 0.08,
    maxHeight: 5,
};

const DEFAULT_CFG = {
    stops: DEFAULT_STOPS,
    floorTextZ: 7.3,
    photoZ: 5.8,
    fogNear: 14,
    fogFar: 32,
    billboard: DEFAULT_BILLBOARD,
    stack: DEFAULT_STACK,
    support: DEFAULT_SUPPORT,
    tv: DEFAULT_TV,
    codeCaption: DEFAULT_CODE_CAPTION,
    hub: DEFAULT_HUB,
};

const PLATFORMS = [
    { key: 'spotify',    label: 'SPOTIFY',    color: '#1ed760', urlField: 'spotifyUrl' },
    { key: 'soundcloud', label: 'SOUNDCLOUD', color: '#ff5500', urlField: 'soundcloudUrl' },
    { key: 'bandcamp',   label: 'BANDCAMP',   color: '#629aa9', urlField: 'bandcampUrl' },
    { key: 'youtube',    label: 'YOUTUBE',    color: '#ff0000', urlField: 'youtubeUrl' },
    { key: 'telegram',   label: 'TELEGRAM',   color: '#229ed9', urlField: 'telegramUrl' },
];

// Simple Icons (CC0) paths, 24x24 viewBox.
const LOGO_PATHS = {
    spotify: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.94-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.282 1.08zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.84-.66 13.5 1.621.42.18.6.78.241 1.2zm.122-3.36C15 8.821 8.7 8.58 5.16 9.78c-.6.18-1.2-.18-1.38-.72-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z',
    soundcloud: 'M0 16.5h1.5v-7.5H0V16.5zm3-7.5v7.5h1.5v-7.5H3zm3 0v7.5h1.5v-7.5H6zm3-3v10.5h1.5V6H9zm3 1.5v9h1.5v-9H12zm3-1.5v10.5h1.5V6H15zm3 1.5v9h1.5v-9H18zM21 9c-.51 0-1.005.083-1.469.236A8.24 8.24 0 0 0 12 5.25v11.25h9c1.658 0 3-1.343 3-3s-1.342-3-3-3z',
    bandcamp: 'M0 18.75l7.437-13.5H24l-7.438 13.5H0z',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
};

const logoTexCache = new Map();

const buildLogoTexture = (key, color) => {
    const cacheKey = `${key}|${color}`;
    if (logoTexCache.has(cacheKey)) return logoTexCache.get(cacheKey);
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    const path = LOGO_PATHS[key];
    if (path) {
        const pad = size * 0.18;
        const inner = size - pad * 2;
        const scale = inner / 24;
        ctx.save();
        ctx.translate(pad, pad);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fill(new Path2D(path));
        ctx.restore();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    logoTexCache.set(cacheKey, tex);
    return tex;
};

const CFG_STORAGE_KEY = 'muvs:home-new:cfg:v1';
const HUB_IN_CANVAS = new Set(['music', 'mixes', 'code', 'about']);
const HUB_SECTION_CONFIG_KEYS = {
    music: 'musicNewConfig',
    mixes: 'mixesNewConfig',
    code: 'codeNewConfig',
    about: 'aboutNewConfig',
};
const hubDynamicEase = (t) => hubSmoothstep(hubSmoothstep(t));

const toSlug = (r) => (r?.slug || r?.title || '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sceneItemKey = (item, index = 0) => String(item?.id ?? item?.slug ?? (toSlug(item) || index));

const itemImageUrls = (item) => {
    if (!item) return [];
    const gallery = Array.isArray(item.gallery)
        ? item.gallery.map((entry) => (typeof entry === 'string' ? entry : entry?.image))
        : [];
    return [item.coverImage, item.thumbnail, item.backgroundImage, ...gallery]
        .filter((url, index, urls) => url && urls.indexOf(url) === index);
};

const primaryItemImage = (item) => item?.coverImage || item?.thumbnail || item?.backgroundImage || '';

const buildDefaultStops = (count) => {
    const out = [];
    for (let i = 0; i < count; i++) {
        out.push({ ...DEFAULT_STOPS[Math.min(i, DEFAULT_STOPS.length - 1)] });
    }
    return out;
};

const fitStops = (stops, expected) => {
    if (!expected || stops.length === expected) return stops;
    if (stops.length > expected) return stops.slice(0, expected);
    const last = stops[stops.length - 1] || DEFAULT_STOPS[0];
    const out = stops.slice();
    while (out.length < expected) out.push({ ...last });
    return out;
};

const hydrateCfg = (cfg, expectedStops) => {
    if (!cfg?.stops?.length) return null;
    return {
        ...DEFAULT_CFG,
        ...cfg,
        stops: fitStops(cfg.stops, expectedStops),
        billboard: { ...DEFAULT_BILLBOARD, ...(cfg.billboard || {}) },
        stack: { ...DEFAULT_STACK, ...(cfg.stack || {}), pos: { ...DEFAULT_STACK.pos, ...(cfg.stack?.pos || {}) } },
        support: { ...DEFAULT_SUPPORT, ...(cfg.support || {}), pos: { ...DEFAULT_SUPPORT.pos, ...(cfg.support?.pos || {}) } },
        tv: {
            ...DEFAULT_TV,
            ...(cfg.tv || {}),
            pos: { ...DEFAULT_TV.pos, ...(cfg.tv?.pos || {}) },
            screen: { ...DEFAULT_TV.screen, ...(cfg.tv?.screen || {}) },
            iframeShift: { ...DEFAULT_TV.iframeShift, ...(cfg.tv?.iframeShift || {}) },
        },
        codeCaption: {
            ...DEFAULT_CODE_CAPTION,
            ...(cfg.codeCaption || {}),
            pos: { ...DEFAULT_CODE_CAPTION.pos, ...(cfg.codeCaption?.pos || {}) },
        },
        hub: { ...DEFAULT_HUB, ...(cfg.hub || {}) },
    };
};

// ================ snap scroll (vertical) ================

const useSnapScroll = (numStops, { enabled = true, onOverscrollUp, initialIndex = 0, minIndex = 0 } = {}) => {
    const minIndexRef = useRef(minIndex);
    useEffect(() => { minIndexRef.current = minIndex; }, [minIndex]);
    const initial = Math.max(minIndex, Math.min(numStops - 1, initialIndex));
    const indexRef = useRef(initial);
    const progressRef = useRef(numStops <= 1 ? 0 : initial / (numStops - 1));
    const [currentIndex, setCurrentIndex] = useState(initial);
    const overscrollUpRef = useRef(onOverscrollUp);
    useEffect(() => { overscrollUpRef.current = onOverscrollUp; }, [onOverscrollUp]);

    const goTo = useCallback(
        (idx, immediate = false, minOverride = null) => {
            const floor = minOverride ?? minIndexRef.current;
            const i = Math.max(floor, Math.min(numStops - 1, idx));
            indexRef.current = i;
            if (immediate) progressRef.current = numStops <= 1 ? 0 : i / (numStops - 1);
            setCurrentIndex(i);
        },
        [numStops],
    );

    useEffect(() => {
        if (!enabled) return undefined;
        let lastWheel = 0;
        const step = (dir) => {
            if (dir === -1 && indexRef.current <= minIndexRef.current) {
                overscrollUpRef.current?.();
                return;
            }
            const next = Math.max(minIndexRef.current, Math.min(numStops - 1, indexRef.current + dir));
            if (next !== indexRef.current) {
                indexRef.current = next;
                setCurrentIndex(next);
            }
        };
        const onWheel = (e) => {
            // Only handle vertical-dominant scroll; horizontal goes to release switcher.
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            const now = Date.now();
            if (now - lastWheel < 650) return;
            if (Math.abs(e.deltaY) < 4) return;
            lastWheel = now;
            step(e.deltaY > 0 ? 1 : -1);
        };
        let touchY = null;
        let touchX = null;
        const onTouchStart = (e) => { touchY = e.touches[0].clientY; touchX = e.touches[0].clientX; };
        const onTouchEnd = (e) => {
            if (touchY == null) return;
            const endY = e.changedTouches[0]?.clientY ?? touchY;
            const endX = e.changedTouches[0]?.clientX ?? touchX;
            const dy = touchY - endY;
            const dx = touchX - endX;
            // Only act on vertical-dominant swipes.
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
                step(dy > 0 ? 1 : -1);
            }
            touchY = null; touchX = null;
        };
        const onKey = (e) => {
            if (e.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return;
            if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault();
                step(1);
            } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
                e.preventDefault();
                step(-1);
            }
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKey);
        };
    }, [numStops, enabled]);

    useEffect(() => {
        let raf;
        const damping = 0.09;
        const tick = () => {
            const target = numStops <= 1 ? 0 : indexRef.current / (numStops - 1);
            const cur = progressRef.current;
            const next = cur + (target - cur) * damping;
            progressRef.current = Math.abs(target - next) < 0.0005 ? target : next;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [numStops]);

    return { progressRef, currentIndex, goTo };
};

// ================ release switcher (horizontal) ================

const useReleaseSwitcher = (count, onSwitch, { enabled = true } = {}) => {
    const indexRef = useRef(0);
    const offsetRef = useRef(0);
    const [current, setCurrent] = useState(0);
    const onSwitchRef = useRef(onSwitch);
    useEffect(() => { onSwitchRef.current = onSwitch; }, [onSwitch]);

    const setIndex = useCallback((next) => {
        const i = Math.max(0, Math.min(count - 1, next));
        if (i === indexRef.current) return;
        indexRef.current = i;
        setCurrent(i);
        onSwitchRef.current?.(i);
    }, [count]);

    // wheel/touch-driven horizontal switching
    useEffect(() => {
        if (!enabled) return undefined;
        let lastWheel = 0;
        const onWheel = (e) => {
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
            e.preventDefault();
            const now = Date.now();
            if (now - lastWheel < 700) return;
            if (Math.abs(e.deltaX) < 6) return;
            lastWheel = now;
            const dir = e.deltaX > 0 ? 1 : -1;
            const next = Math.max(0, Math.min(count - 1, indexRef.current + dir));
            if (next !== indexRef.current) {
                indexRef.current = next;
                setCurrent(next);
                onSwitchRef.current?.(next);
            }
        };
        let touchY = null; let touchX = null;
        const onTouchStart = (e) => { touchY = e.touches[0].clientY; touchX = e.touches[0].clientX; };
        const onTouchEnd = (e) => {
            if (touchX == null) return;
            const endY = e.changedTouches[0]?.clientY ?? touchY;
            const endX = e.changedTouches[0]?.clientX ?? touchX;
            const dx = touchX - endX;
            const dy = touchY - endY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                const dir = dx > 0 ? 1 : -1;
                const next = Math.max(0, Math.min(count - 1, indexRef.current + dir));
                if (next !== indexRef.current) {
                    indexRef.current = next;
                    setCurrent(next);
                    onSwitchRef.current?.(next);
                }
            }
            touchY = null; touchX = null;
        };
        const onKey = (e) => {
            if (e.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const next = Math.min(count - 1, indexRef.current + 1);
                if (next !== indexRef.current) {
                    indexRef.current = next; setCurrent(next); onSwitchRef.current?.(next);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const next = Math.max(0, indexRef.current - 1);
                if (next !== indexRef.current) {
                    indexRef.current = next; setCurrent(next); onSwitchRef.current?.(next);
                }
            }
        };
        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKey);
        };
    }, [count, enabled]);

    useEffect(() => {
        let raf;
        const tick = () => {
            const target = indexRef.current * RELEASE_SPACING;
            const cur = offsetRef.current;
            const next = cur + (target - cur) * 0.08;
            offsetRef.current = Math.abs(target - next) < 0.001 ? target : next;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    return {
        offsetRef,
        current,
        prev: () => setIndex(indexRef.current - 1),
        next: () => setIndex(indexRef.current + 1),
        goTo: setIndex,
    };
};

// ================ scene parts ================

const FALLBACK_COVER = '/images/logo.png';

const Billboard = ({ release, x, billboard, hideCover = false, tiltRef, loadFull = true }) => {
    const tex = useProgressiveTexture(release.coverImage || FALLBACK_COVER, { loadFull });

    const { width, height } = useMemo(() => {
        const img = tex?.image;
        const w = img?.naturalWidth || img?.width || 1;
        const h = img?.naturalHeight || img?.height || 1;
        const aspect = w / h;
        if (aspect >= 1) return { width: billboard.coverSize, height: billboard.coverSize / aspect };
        return { width: billboard.coverSize * aspect, height: billboard.coverSize };
    }, [tex, billboard.coverSize]);

    return (
        <group position={[x, 2.6, 0]}>
            <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionHeading">
                <Text
                    position={[0, billboard.titleY, billboard.titleZ]}
                    fontSize={releaseTextSize(release.title3dSize, billboard.titleSize)}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={9}
                    textAlign="center"
                    letterSpacing={-0.02}
                    font={releaseFontUrl(release.title3dFont || billboard.titleFont, FONT_BOLD)}
                >
                    {release.title || 'Untitled'}
                </Text>

                <Text
                    position={[0, billboard.artistY, billboard.artistZ]}
                    fontSize={releaseTextSize(release.artist3dSize, billboard.artistSize)}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.15}
                    font={releaseFontUrl(release.artist3dFont || billboard.artistFont, FONT_REGULAR)}
                >
                    {release.artists || ''}
                </Text>
            </GyroParallaxLayer>

            {!hideCover && (
                <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionImage">
                    <mesh position={[0, billboard.coverY, 0]}>
                        <planeGeometry args={[width, height]} />
                        <meshBasicMaterial key={tex?.uuid || 'empty'} map={tex || null} color={tex ? '#ffffff' : '#d8dcde'} transparent toneMapped={false} />
                    </mesh>
                </GyroParallaxLayer>
            )}
        </group>
    );
};

const FloorText = ({ release, x, z, richText = false, fullDescriptionOnly = false, tiltRef }) => {
    const meta = release.releaseDate ? `RELEASED · ${release.releaseDate}` : '';
    const html = richText
        ? (fullDescriptionOnly ? (release.fullDescription || '') : (release.fullDescription || release.description || ''))
        : '';
    const plain = richText ? '' : stripHtml(release.description);

    return (
        <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionFloorText">
        <group position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <Text
                position={[0, 0, 0]}
                fontSize={0.22}
                color="#888888"
                anchorX="center"
                anchorY="top"
                letterSpacing={0.18}
                font={FONT_REGULAR}
            >
                {meta}
            </Text>

            {richText && html ? (
                <Html
                    transform
                    position={[0, -0.85, 0]}
                    scale={0.02}
                    pointerEvents="none"
                    zIndexRange={[5, 0]}
                >
                    <div
                        className="hn-floor-rich"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </Html>
            ) : !richText ? (
                <Text
                    position={[0, -0.7, 0]}
                    fontSize={0.32}
                    color="#222222"
                    anchorX="center"
                    anchorY="top"
                    maxWidth={6.5}
                    textAlign="center"
                    lineHeight={1.55}
                    font={FONT_REGULAR}
                >
                    {plain}
                </Text>
            ) : null}
        </group>
        </GyroParallaxLayer>
    );
};

const CodeShortDescription = ({ release, x, tiltRef, codeCaption = DEFAULT_CODE_CAPTION }) => {
    if (!release.description) return null;
    const caption = {
        ...DEFAULT_CODE_CAPTION,
        ...codeCaption,
        pos: { ...DEFAULT_CODE_CAPTION.pos, ...(codeCaption?.pos || {}) },
    };
    return (
        <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionFloorText">
        <group position={[x + caption.pos.x, caption.pos.y, caption.pos.z]}>
            <group rotation={[-Math.PI / 2 + THREE.MathUtils.degToRad(caption.tilt), 0, THREE.MathUtils.degToRad(caption.rotation)]}>
                <Html
                    transform
                    center
                    distanceFactor={caption.scale}
                    pointerEvents="none"
                    zIndexRange={[5, 0]}
                >
                    <div
                        className="mp3d-rich-caption hn-code-short"
                        style={{
                            width: `${caption.width}px`,
                            maxWidth: 'none',
                            maxHeight: `${caption.maxHeight}em`,
                            fontSize: `${caption.fontSize}px`,
                            lineHeight: caption.lineHeight,
                            letterSpacing: `${caption.letterSpacing}em`,
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeCaptionHtml(release.description) }}
                    />
                </Html>
            </group>
        </group>
        </GyroParallaxLayer>
    );
};

// Polaroid card geometry (lying on the floor inside a parent group rotated -π/2 around X).
// Card is portrait when rotated up: width 1.55, height 1.85 (slightly taller than wide for the caption strip).
const POLAROID_W = 1.55;
const POLAROID_H = 1.85;
const POLAROID_PHOTO_W = 1.35;
const POLAROID_PHOTO_H = 1.35;
const POLAROID_PHOTO_OFFSET_Y = 0.18; // photo sits above center, leaving caption room below
const POLAROID_CAPTION_Y = -0.7;

const FLOOR_PHOTO_BASE = [
    { x: -2.4, y: -0.3, r: -0.22 },
    { x:  0.5, y:  0.5, r:  0.14 },
    { x: -1.0, y:  0.95, r:  0.25 },
];

// Card footprint with rotation slack baked in.
const FLOOR_CARD_W = POLAROID_W + 0.15;
const FLOOR_CARD_H = POLAROID_H + 0.15;
const FLOOR_CARD_AREA = FLOOR_CARD_W * FLOOR_CARD_H;
const FLOOR_MAX_OVERLAP = 0.2 * FLOOR_CARD_AREA;

const aabbOverlap = (a, b) => {
    const dx = Math.max(0, Math.min(a.x + FLOOR_CARD_W / 2, b.x + FLOOR_CARD_W / 2) - Math.max(a.x - FLOOR_CARD_W / 2, b.x - FLOOR_CARD_W / 2));
    const dy = Math.max(0, Math.min(a.y + FLOOR_CARD_H / 2, b.y + FLOOR_CARD_H / 2) - Math.max(a.y - FLOOR_CARD_H / 2, b.y - FLOOR_CARD_H / 2));
    return dx * dy;
};

const generateFloorSheets = (gallery, seed) => {
    const rand = () => Math.random();
    const placed = [];
    return FLOOR_PHOTO_BASE.map((base, i) => {
        let candidate;
        for (let attempt = 0; attempt < 30; attempt++) {
            candidate = {
                x: base.x + (rand() - 0.5) * 1.6,
                y: base.y + (rand() - 0.5) * 0.7,
            };
            const worst = placed.reduce((m, p) => Math.max(m, aabbOverlap(candidate, p)), 0);
            if (worst <= FLOOR_MAX_OVERLAP) break;
        }
        placed.push(candidate);
        const item = gallery?.[i];
        return {
            ...candidate,
            r: base.r + (rand() - 0.5) * 0.5,
            image: typeof item === 'string' ? item : (item?.image || ''),
            caption: typeof item === 'string' ? '' : (item?.text || item?.caption || ''),
            seed: seed + i,
        };
    });
};

const tmpVec = new THREE.Vector3();

const PolaroidPhoto = ({ image, loadFull }) => {
    const tex = useProgressiveTexture(image, { loadFull, previewWidth: 160 });
    return (
        <mesh position={[0, POLAROID_PHOTO_OFFSET_Y, 0.008]}>
            <planeGeometry args={[POLAROID_PHOTO_W, POLAROID_PHOTO_H]} />
            <meshBasicMaterial key={tex?.uuid || 'empty'} map={tex || null} color={tex ? '#ffffff' : '#d8dcde'} toneMapped={false} />
        </mesh>
    );
};

const PaperCard = () => {
    const tex = useTexture('/images/textures/paper.webp');
    useEffect(() => {
        if (!tex) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 4;
        tex.needsUpdate = true;
    }, [tex]);
    return (
        <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[POLAROID_W, POLAROID_H]} />
            <meshStandardMaterial map={tex} roughness={0.95} metalness={0} />
        </mesh>
    );
};

const FloorPhotoSheet = ({ sheet, index, loadFull }) => {
    const groupRef = useRef(null);
    const [active, setActive] = useState(false);
    const { camera } = useThree();

    const restPos = useMemo(() => new THREE.Vector3(sheet.x, sheet.y, index * 0.01), [sheet.x, sheet.y, index]);
    const restQuat = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, sheet.r)), [sheet.r]);

    useFrame(() => {
        const obj = groupRef.current;
        if (!obj) return;
        const parent = obj.parent;
        if (!parent) return;
        if (active) {
            tmpVec.set(0, -0.1, -1.6).applyQuaternion(camera.quaternion);
            const wp = camera.getWorldPosition(new THREE.Vector3()).add(tmpVec);
            parent.updateMatrixWorld();
            const local = parent.worldToLocal(wp.clone());
            obj.position.lerp(local, 0.14);
            const parentWQ = parent.getWorldQuaternion(new THREE.Quaternion());
            const target = parentWQ.clone().invert().multiply(camera.quaternion);
            obj.quaternion.slerp(target, 0.14);
        } else {
            obj.position.lerp(restPos, 0.16);
            obj.quaternion.slerp(restQuat, 0.16);
        }
    });

    const onClick = (e) => {
        e.stopPropagation();
        setActive((v) => !v);
    };

    return (
        <group ref={groupRef} position={restPos} quaternion={restQuat} onClick={onClick}>
            {/* paper polaroid card */}
            <Suspense fallback={
                <mesh position={[0, 0, 0.004]}>
                    <planeGeometry args={[POLAROID_W, POLAROID_H]} />
                    <meshStandardMaterial color="#efe9d9" roughness={0.95} metalness={0} />
                </mesh>
            }>
                <PaperCard />
            </Suspense>
            {/* photo (or placeholder) */}
            {sheet.image ? (
                <PolaroidPhoto image={sheet.image} loadFull={loadFull} />
            ) : (
                <mesh position={[0, POLAROID_PHOTO_OFFSET_Y, 0.008]}>
                    <planeGeometry args={[POLAROID_PHOTO_W, POLAROID_PHOTO_H]} />
                    <meshStandardMaterial color="#d8dcde" roughness={0.86} metalness={0} />
                </mesh>
            )}
            {/* caption */}
            {sheet.caption && (
                <Text
                    position={[0, POLAROID_CAPTION_Y, 0.012]}
                    fontSize={0.18}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="middle"
                    maxWidth={POLAROID_W - 0.2}
                    textAlign="center"
                    lineHeight={1.15}
                    font={FONT_HANDWRITTEN}
                >
                    {sheet.caption}
                </Text>
            )}
        </group>
    );
};

const FloorPhotoSheets = ({ x, z, seed, gallery, tiltRef, loadFull }) => {
    const sheets = useMemo(() => generateFloorSheets(gallery, seed), [gallery, seed]);
    return (
        <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionPhotos">
        <group position={[x, 0.018, z]} rotation={[-Math.PI / 2, 0, 0]}>
            {sheets.map((sheet, index) => (
                <FloorPhotoSheet key={index} sheet={sheet} index={index} loadFull={loadFull} />
            ))}
        </group>
        </GyroParallaxLayer>
    );
};

const Floor = ({ big = false }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        {/* hub mode hosts section worlds ~90 units out — the floor must reach them */}
        <planeGeometry args={big ? [260, 260] : [160, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
);

const PlatformBox = ({ pos, size, platformKey, color, url }) => {
    const tex = useMemo(() => buildLogoTexture(platformKey, color), [platformKey, color]);

    const onClick = (e) => {
        e.stopPropagation();
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <mesh position={pos} onClick={onClick}>
            <boxGeometry args={[size, size, size]} />
            <meshStandardMaterial map={tex} roughness={0.45} metalness={0.05} />
        </mesh>
    );
};

// Pyramid: row 0 = 3 bottom boxes (i=0,1,2), row 1 = 2 top boxes (i=3,4) sitting
// in the valleys between adjacent bottom boxes. Z splits the bottom row into a
// shallow front/back so the top boxes have a stable triangular footprint.
const PYRAMID_LAYOUT = [
    { col: -1, row: 0, dz: 0 },
    { col:  0, row: 0, dz: 0 },
    { col:  1, row: 0, dz: 0 },
    { col: -0.5, row: 1, dz: 0 },
    { col:  0.5, row: 1, dz: 0 },
];

const PlatformStack = ({ release, x, stackCfg }) => {
    const { pos, boxSize, gap } = stackCfg;
    const baseX = x + pos.x;
    const D = boxSize + gap;
    return PLATFORMS.map((p, i) => {
        const layout = PYRAMID_LAYOUT[i] || { col: 0, row: 0, dz: 0 };
        const px = baseX + layout.col * D;
        const py = pos.y + boxSize / 2 + layout.row * (boxSize + gap);
        const pz = pos.z + layout.dz;
        return (
            <PlatformBox
                key={p.key}
                pos={[px, py, pz]}
                size={boxSize}
                platformKey={p.key}
                color={p.color}
                url={release?.[p.urlField]}
            />
        );
    });
};

const SupportFloorText = ({ x, support, tiltRef }) => (
    <GyroParallaxLayer tiltRef={tiltRef} layerKey="sectionSupport">
    <group position={[x + support.pos.x, support.pos.y, support.pos.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text
            position={[0, 0, 0]}
            fontSize={support.metaSize}
            color="#888888"
            anchorX="center"
            anchorY="top"
            letterSpacing={0.18}
            font={FONT_REGULAR}
        >
            SUPPORT THE RELEASE
        </Text>
        <Text
            position={[0, -0.28, 0]}
            fontSize={support.fontSize}
            color="#1a1a1a"
            anchorX="center"
            anchorY="top"
            letterSpacing={0.04}
            font={FONT_BOLD}
        >
            LISTEN
        </Text>
    </group>
    </GyroParallaxLayer>
);

const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

const useDeviceTilt = (settings) => {
    const tiltRef = useRef({
        targetX: 0,
        targetY: 0,
        x: 0,
        y: 0,
        config: DEVICE_TILT_DEFAULTS,
    });
    tiltRef.current.config = mergeDeviceTiltSettings(settings);

    useEffect(() => {
        const OrientationEvent = window.DeviceOrientationEvent;
        const isMobile = window.matchMedia('(pointer: coarse)').matches;
        if (!OrientationEvent || !isMobile || !tiltRef.current.config.enabled) return undefined;

        let baseline = null;
        let listening = false;
        const resetBaseline = () => { baseline = null; };
        const onOrientation = (event) => {
            if (!Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
            const screenAngle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0);
            let horizontal = event.gamma;
            let vertical = event.beta;
            if (Math.abs(screenAngle) === 90) {
                horizontal = screenAngle > 0 ? event.beta : -event.beta;
                vertical = screenAngle > 0 ? -event.gamma : event.gamma;
            }
            if (!baseline) baseline = { horizontal, vertical };
            const maxTiltDeg = Math.max(1, Number(tiltRef.current.config.maxTiltDeg) || 18);
            tiltRef.current.targetX = THREE.MathUtils.clamp((horizontal - baseline.horizontal) / maxTiltDeg, -1, 1);
            tiltRef.current.targetY = THREE.MathUtils.clamp((vertical - baseline.vertical) / maxTiltDeg, -1, 1);
        };
        const startListening = () => {
            if (listening) return;
            listening = true;
            window.addEventListener('deviceorientation', onOrientation, true);
            window.addEventListener('orientationchange', resetBaseline);
        };

        let requestOnTouch = null;
        if (typeof OrientationEvent.requestPermission === 'function') {
            requestOnTouch = async () => {
                try {
                    if (await OrientationEvent.requestPermission() === 'granted') startListening();
                } catch { /* permission denied or unavailable */ }
            };
            window.addEventListener('pointerdown', requestOnTouch, { once: true, passive: true });
        } else {
            startListening();
        }

        return () => {
            if (requestOnTouch) window.removeEventListener('pointerdown', requestOnTouch);
            if (listening) {
                window.removeEventListener('deviceorientation', onOrientation, true);
                window.removeEventListener('orientationchange', resetBaseline);
            }
            tiltRef.current.targetX = 0;
            tiltRef.current.targetY = 0;
            tiltRef.current.x = 0;
            tiltRef.current.y = 0;
        };
    }, [settings?.enabled]);

    return tiltRef;
};

const TILT_ORBIT_OFFSET = new THREE.Vector3();
const TILT_ORBIT_RIGHT = new THREE.Vector3();
const TILT_ORBIT_UP = new THREE.Vector3();

const applyDeviceTilt = (camera, tiltRef, delta, focalPoint) => {
    if (!tiltRef) return;
    const tilt = tiltRef.current;
    const config = tilt.config || DEVICE_TILT_DEFAULTS;
    if (!config.enabled) return;
    const smoothing = Math.max(0.1, Number(config.smoothing) || DEVICE_TILT_DEFAULTS.smoothing);
    const damping = 1 - Math.exp(-Math.min(delta, 0.1) * smoothing);
    tilt.x = THREE.MathUtils.lerp(tilt.x, tilt.targetX, damping);
    tilt.y = THREE.MathUtils.lerp(tilt.y, tilt.targetY, damping);
    const horizontalDirection = config.invertHorizontal ? -1 : 1;
    const verticalDirection = config.invertVertical ? 1 : -1;
    if (!focalPoint) return;

    // Orbit on a sphere around the framed object. Keeping the radius constant
    // and finishing with lookAt makes the image center a true visual anchor.
    TILT_ORBIT_OFFSET.copy(camera.position).sub(focalPoint);
    TILT_ORBIT_RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    TILT_ORBIT_UP.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    const yaw = THREE.MathUtils.degToRad(
        tilt.x * Number(config.yawDeg || 0) * horizontalDirection,
    );
    const pitch = THREE.MathUtils.degToRad(
        tilt.y * Number(config.pitchDeg || 0) * verticalDirection,
    );
    TILT_ORBIT_OFFSET.applyAxisAngle(TILT_ORBIT_UP, yaw);
    TILT_ORBIT_RIGHT.applyAxisAngle(TILT_ORBIT_UP, yaw);
    TILT_ORBIT_OFFSET.applyAxisAngle(TILT_ORBIT_RIGHT, pitch);
    camera.position.copy(focalPoint).add(TILT_ORBIT_OFFSET);
    camera.lookAt(focalPoint);
    camera.updateMatrixWorld();
};

// Interpolated camera pose along the section stops at progress p (0..1).
const sampleStops = (stops, p) => {
    const segCount = stops.length - 1;
    const pc = THREE.MathUtils.clamp(p, 0, 1);
    const segFloat = pc * segCount;
    const segIdx = Math.min(Math.floor(segFloat), segCount - 1);
    const lt = segFloat - segIdx;
    const e = lt * lt * (3 - 2 * lt);
    const a = stops[segIdx];
    const b = stops[segIdx + 1];
    return {
        pos: lerpVec(a.pos, b.pos, e),
        look: lerpVec(a.look, b.look, e),
        fov: lerp(a.fov, b.fov, e),
    };
};

const ScrollCamera = ({ cfgRef, progressRef, releaseOffsetRef, tiltRef }) => {
    const lookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }, delta) => {
        const c = cfgRef.current;
        const { pos, look, fov } = sampleStops(c.stops, progressRef.current);
        const offX = releaseOffsetRef.current;

        camera.position.set(pos.x + offX, pos.y, pos.z);
        lookAt.current.set(look.x + offX, look.y, look.z);
        camera.lookAt(lookAt.current);
        applyDeviceTilt(camera, tiltRef, delta, lookAt.current);

        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
    });

    return null;
};

// Camera master for hub mode: linear menu switching, menu↔section travel
// ('travel'), stop-scroll inside the section ('section'), and fog-out toward
// a section that still lives on its own route ('foreign'). The section world
// sits along the MUSIC ray: local → world is rotY(π) then translate -sectionDist.
const HubCamera = ({ cfgRef, stRef, progressRef, releaseOffsetRef, onPhase, onForeignLeft, ringRef, sectionRef, tiltRef }) => {
    const lookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }, delta) => {
        const cfg = cfgRef.current;
        const hub = cfg.hub || DEFAULT_HUB;
        const st = stRef.current;

        // troika Text ignores scene fog, so distant worlds would shine through
        // it — toggle whole-world visibility around the travel midpoint instead.
        if (ringRef?.current) {
            ringRef.current.visible = st.phase !== 'section' && !(st.phase === 'travel' && st.tt > 0.55);
        }
        if (sectionRef?.current) {
            sectionRef.current.visible = st.phase === 'section' || (st.phase === 'travel' && st.tt > 0.45);
        }

        const targetA = st.menuIndex * HUB_SPACING;
        st.angle += (targetA - st.angle) * 0.08;
        if (st.phase === 'menu' && Math.abs(targetA - st.angle) < 0.001) {
            const count = HUB_ITEMS.length;
            if (st.menuIndex < count) {
                st.menuIndex += count;
                st.angle += count * HUB_SPACING;
            } else if (st.menuIndex >= count * 2) {
                st.menuIndex -= count;
                st.angle -= count * HUB_SPACING;
            }
        }

        const D = hub.sectionDist;
        const sectionX = st.angle;
        const s2w = (p, ox = 0) => ({ x: sectionX - (p.x + ox), y: p.y, z: -p.z - D });
        if (sectionRef?.current) sectionRef.current.position.set(sectionX, 0, -D);

        let pose;
        if (st.phase === 'section') {
            const lp = sampleStops(cfg.stops, progressRef.current);
            const ox = releaseOffsetRef.current;
            const sectionLook = { ...lp.look, y: lp.look.y + 0.22 };
            pose = { pos: s2w(lp.pos, ox), look: s2w(sectionLook, ox), fov: lp.fov };
        } else if (st.phase === 'travel') {
            const travelDuration = Math.max(0.36, (hub.travelDur || 1.8) / 3);
            st.tt = Math.max(0, Math.min(1, st.tt + (delta / travelDuration) * st.dir));
            const a = hubMenuPose(hub, st.angle);
            const lp = sampleStops(cfg.stops, progressRef.current);
            const ox = releaseOffsetRef.current;
            const sectionLook = { ...lp.look, y: lp.look.y + 0.22 };
            const b = { pos: s2w(lp.pos, ox), look: s2w(sectionLook, ox), fov: lp.fov };
            // Double smoothstep exaggerates the symmetric acceleration profile:
            // softer endpoints and a substantially faster midpoint.
            pose = lerpPose(a, b, hubDynamicEase(st.tt));
            if (st.dir > 0 && st.tt >= 1) {
                st.phase = 'section';
                onPhase('section');
            } else if (st.dir < 0 && st.tt <= 0) {
                st.phase = 'menu';
                onPhase('menu');
            }
        } else if (st.phase === 'foreign') {
            st.tt = Math.max(0, Math.min(1, st.tt + (delta / 0.4) * st.dir));
            const e = hubSmoothstep(st.tt);
            const menuPose = hubMenuPose(hub, st.angle);
            pose = {
                pos: { x: menuPose.pos.x, y: hub.camY + 0.8 * e, z: menuPose.pos.z - 26 * e },
                look: menuPose.look,
                fov: hub.fov,
            };
            if (st.dir > 0 && st.tt >= 1 && !st.done) {
                st.done = true;
                onForeignLeft();
            } else if (st.dir < 0 && st.tt <= 0) {
                st.phase = 'menu';
                st.dir = 0;
                onPhase('menu');
            }
        } else {
            pose = hubMenuPose(hub, st.angle);
        }

        camera.position.set(pose.pos.x, pose.pos.y, pose.pos.z);
        lookAt.current.set(pose.look.x, pose.look.y, pose.look.z);
        camera.lookAt(lookAt.current);
        applyDeviceTilt(camera, tiltRef, delta, lookAt.current);
        if (Math.abs(camera.fov - pose.fov) > 0.01) {
            camera.fov = pose.fov;
            camera.updateProjectionMatrix();
        }
    });

    return null;
};

const CamDolly = ({ cfgRef, restZRef, playing, playZ }) => {
    useFrame(() => {
        const stops = cfgRef.current?.stops;
        if (!stops || !stops[0]) return;
        const target = playing ? playZ : restZRef.current;
        if (target == null) return;
        stops[0].pos.z = THREE.MathUtils.lerp(stops[0].pos.z, target, 0.06);
    });
    return null;
};

const FogSync = ({ cfgRef }) => {
    useFrame(({ scene }) => {
        const c = cfgRef.current;
        if (scene.fog) {
            scene.fog.near = c.fogNear;
            scene.fog.far = c.fogFar;
        }
    });
    return null;
};

// TV-shaped element (mixes_pic.png — TV in jungle plants with transparent screen cutout).
// Renders the YouTube iframe behind the PNG so the cutout reveals it as if on the screen.
// Image native 900 × 607 px; transparent screen ratios at x=23.4..71.2%, y=31.4..68.6%.
const TV_NATIVE = { w: 900, h: 607 };

const TV_STATIC_VERTEX = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const TV_STATIC_FRAGMENT = `
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
        float frame = floor(uTime * 24.0);
        vec2 grainUv = floor(vUv * vec2(420.0, 260.0));
        float grain = hash(grainUv + frame * vec2(17.0, 43.0));
        float fine = hash(floor(vUv * vec2(900.0, 520.0)) - frame * 7.0);
        float scanline = 0.82 + 0.18 * sin(vUv.y * 1100.0 + uTime * 13.0);
        float tearBand = step(0.985, hash(vec2(floor(vUv.y * 90.0), floor(uTime * 7.0))));
        float tear = tearBand * hash(vec2(floor(uTime * 19.0), floor(vUv.y * 120.0)));
        float vignette = smoothstep(0.72, 0.18, distance(vUv, vec2(0.5)));
        float value = clamp((grain * 0.72 + fine * 0.28 + tear * 0.5) * scanline, 0.0, 1.0);
        value *= 0.72 + vignette * 0.28;
        gl_FragColor = vec4(vec3(value), 1.0);
    }
`;

const TVStaticScreen = ({ position, width, height }) => {
    const materialRef = useRef(null);
    const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
    useFrame(({ clock }) => {
        if (materialRef.current) materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    });
    return (
        <group position={position}>
            <mesh>
                <planeGeometry args={[width, height]} />
                <shaderMaterial
                    ref={materialRef}
                    vertexShader={TV_STATIC_VERTEX}
                    fragmentShader={TV_STATIC_FRAGMENT}
                    uniforms={uniforms}
                    toneMapped={false}
                />
            </mesh>
            <Text
                position={[0, 0, 0.012]}
                fontSize={Math.min(width * 0.11, height * 0.22)}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.16}
                font={FONT_BOLD}
                outlineWidth={Math.min(width, height) * 0.004}
                outlineColor="#000000"
            >
                COMING SOON
            </Text>
        </group>
    );
};

const extractYouTubeId = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
};

const TVScreen = ({ mix, tv = DEFAULT_TV, playing = false, comingSoon = false }) => {
    const tex = useTexture('/images/mixes-tv.webp');
    useEffect(() => { if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; } }, [tex]);
    const W = tv.scale;
    const H = W * (TV_NATIVE.h / TV_NATIVE.w);
    const sw = W * (tv.screen.x1 - tv.screen.x0);
    const sh = H * (tv.screen.y1 - tv.screen.y0);
    const cx = (tv.screen.x0 + tv.screen.x1) / 2 - 0.5;
    const cy = 0.5 - (tv.screen.y0 + tv.screen.y1) / 2;
    const ox = cx * W + tv.iframeShift.x;
    const oy = cy * H + tv.iframeShift.y;
    const iz = tv.iframeShift.z || 0;
    const ytId = extractYouTubeId(mix?.youtubeUrl);
    const src = ytId
        ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1${playing ? '&autoplay=1' : ''}`
        : '';
    // drei <Html transform> bakes a 1/40 matrix multiplier (DREI_FACTOR).
    // Combined with group.scale=1/PX, the clip wrapper renders at exactly sw×sh
    // worldunits when its CSS box is sw*PX*DREI_FACTOR × sh*PX*DREI_FACTOR.
    // We then render the iframe at a *small* native size (so YouTube emits a
    // readable, click-target-sized UI) and CSS-scale it up to fill the clip,
    // so on screen the UI ends up large but still slotted into the cutout.
    const PX = 32;
    const DREI_FACTOR = 40;
    const clipW = Math.round(sw * PX * DREI_FACTOR);
    const clipH = Math.round(sh * PX * DREI_FACTOR);
    const ifNative = Math.max(280, Math.min(1280, Math.round(tv.iframeScale * 15))); // 40 → 600px native
    const ifW = ifNative;
    const ifH = Math.round(ifNative * sh / sw);
    const sx = clipW / ifW;
    const sy = clipH / ifH;
    return (
        <group position={[tv.pos.x, tv.pos.y, tv.pos.z]}>
            {comingSoon ? (
                <TVStaticScreen position={[ox, oy, iz - 0.02]} width={sw} height={sh} />
            ) : src ? (
                <Html
                    transform
                    position={[ox, oy, iz - 0.02]}
                    scale={1 / PX}
                    pointerEvents="auto"
                >
                    <div
                        style={{
                            width: `${clipW}px`,
                            height: `${clipH}px`,
                            overflow: 'hidden',
                            background: '#000',
                            position: 'relative',
                        }}
                    >
                        <iframe
                            key={src}
                            src={src}
                            title={mix?.title || 'mix'}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                                width: `${ifW}px`,
                                height: `${ifH}px`,
                                border: 0,
                                background: '#000',
                                display: 'block',
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                transform: `scale(${sx}, ${sy})`,
                                transformOrigin: 'top left',
                            }}
                        />
                    </div>
                </Html>
            ) : (
                <mesh position={[ox, oy, iz - 0.015]}>
                    <planeGeometry args={[sw, sh]} />
                    <meshBasicMaterial color="#0a0a0a" toneMapped={false} />
                </mesh>
            )}
            <mesh>
                <planeGeometry args={[W, H]} />
                <meshBasicMaterial map={tex} transparent toneMapped={false} />
            </mesh>
        </group>
    );
};

const PortfolioImage = ({ image, w, h }) => {
    const tex = useProgressiveTexture(image, { loadFull: true });
    return (
        <mesh>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial key={tex?.uuid || 'empty'} map={tex || null} color={tex ? '#ffffff' : '#d8dcde'} toneMapped={false} />
        </mesh>
    );
};

const PortfolioItem = ({ pos, image, url, label, description, size = [4.5, 6] }) => {
    const [w, h] = size;
    const onClick = () => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
        <group position={pos}>
            <group position={[0, h / 2 + 0.1, 0]} onClick={onClick}>
                {image ? (
                    <Suspense fallback={null}>
                        <PortfolioImage image={image} w={w} h={h} />
                    </Suspense>
                ) : (
                    <mesh>
                        <planeGeometry args={[w, h]} />
                        <meshBasicMaterial color="#dcdcdc" toneMapped={false} />
                    </mesh>
                )}
            </group>
            {label && (
                <Text
                    position={[0, -0.05, 0]}
                    fontSize={0.32}
                    color="#1a1a1a"
                    anchorX="center"
                    anchorY="top"
                    letterSpacing={0.08}
                    font={FONT_BOLD}
                >
                    {label.toUpperCase()}
                </Text>
            )}
            {description && (
                <Text
                    position={[0, -0.55, 0]}
                    fontSize={0.18}
                    color="#444444"
                    anchorX="center"
                    anchorY="top"
                    maxWidth={w + 1}
                    textAlign="center"
                    lineHeight={1.4}
                    font={FONT_REGULAR}
                >
                    {description}
                </Text>
            )}
        </group>
    );
};

const DEFAULT_PORTFOLIO_LAYOUT = [
    { x:  6, z: 14 },
    { x: -6, z: 22 },
    { x:  6, z: 30 },
];

const PortfolioItems = ({ items, tiltRef }) => (
    <>
        {items.map((it, i) => (
            <GyroParallaxLayer key={it.id ?? i} tiltRef={tiltRef} layerKey="sectionPortfolio">
            <PortfolioItem
                pos={[it.x ?? DEFAULT_PORTFOLIO_LAYOUT[i]?.x ?? 0, 0, it.z ?? DEFAULT_PORTFOLIO_LAYOUT[i]?.z ?? 0]}
                image={it.image}
                url={it.url}
                label={it.label}
                description={it.description}
            />
            </GyroParallaxLayer>
        ))}
    </>
);

const Scene = ({ releases, activeItemIndex = 0, activeItemOnly = false, cfgRef, progressRef, releaseOffsetRef, tiltRef, floorTextZ, photoZ, billboard, stack, support, codeCaption, showCodeCaption, fullDescriptionOnly, simple, portfolio, richText, tvMix, tvPlaying, tv, tvComingSoon, dollyRestZRef, dollyPlayZ, dollyEnabled, hideBillboard = false, hub = null }) => {
    const visibleReleaseEntries = releases
        .map((release, index) => ({ release, index }))
        .filter(({ index }) => !activeItemOnly || index === activeItemIndex);
    const sectionContent = (
        <>
            {!simple && visibleReleaseEntries.map(({ release, index }) => (
                <PlatformStack key={`stack-${release.id ?? index}`} release={release} x={index * RELEASE_SPACING} stackCfg={stack} />
            ))}
            {visibleReleaseEntries.map(({ release, index }) => (
                <React.Fragment key={release.id ?? index}>
                    {!hideBillboard && (
                        <Billboard
                            release={release}
                            x={index * RELEASE_SPACING}
                            billboard={billboard}
                            hideCover={!!tvMix}
                            tiltRef={tiltRef}
                            loadFull={Math.abs(index - activeItemIndex) <= 1}
                        />
                    )}
                    <FloorPhotoSheets x={index * RELEASE_SPACING} z={photoZ} seed={index * 7} gallery={release.gallery} tiltRef={tiltRef} loadFull={Math.abs(index - activeItemIndex) <= 1} />
                    <FloorText release={release} x={index * RELEASE_SPACING} z={floorTextZ} richText={richText} fullDescriptionOnly={fullDescriptionOnly} tiltRef={tiltRef} />
                    {showCodeCaption && <CodeShortDescription release={release} x={index * RELEASE_SPACING} tiltRef={tiltRef} codeCaption={codeCaption} />}
                    {!simple && <SupportFloorText x={index * RELEASE_SPACING} support={support} tiltRef={tiltRef} />}
                </React.Fragment>
            ))}
            {portfolio && portfolio.length > 0 && <PortfolioItems items={portfolio} tiltRef={tiltRef} />}
            {tvMix && <TVScreen mix={tvMix} playing={tvPlaying} tv={tv} comingSoon={tvComingSoon} />}
        </>
    );

    const ringRef = useRef(null);
    const sectionRef = useRef(null);

    return (
        <>
            {hub ? (
                <HubCamera
                    cfgRef={cfgRef}
                    stRef={hub.stateRef}
                    progressRef={progressRef}
                    releaseOffsetRef={releaseOffsetRef}
                    onPhase={hub.onPhase}
                    onForeignLeft={hub.onForeignLeft}
                    ringRef={ringRef}
                    sectionRef={sectionRef}
                    tiltRef={tiltRef}
                />
            ) : (
                <ScrollCamera cfgRef={cfgRef} progressRef={progressRef} releaseOffsetRef={releaseOffsetRef} tiltRef={tiltRef} />
            )}
            {dollyEnabled && <CamDolly cfgRef={cfgRef} restZRef={dollyRestZRef} playing={tvPlaying} playZ={dollyPlayZ} />}
            <FogSync cfgRef={cfgRef} />
            <fog attach="fog" args={['#ffffff', 14, 32]} />
            <ambientLight intensity={0.75} />
            <directionalLight position={[6, 12, 8]} intensity={0.55} />
            <Floor big={!!hub} />
            {hub && (
                <group ref={ringRef}>
                    <RingMenu
                        hub={hub.cfg}
                        covers={hub.covers}
                        captions={hub.captions}
                        particleSettings={hub.particleSettings}
                        onSelect={hub.onSelect}
                        activeIndex={hub.activeIndex}
                        activeOnly={hub.phase !== 'menu'}
                        captionsVisible={hub.phase === 'menu'}
                        particlesVisible={hub.phase === 'menu'}
                        tiltRef={tiltRef}
                    />
                </group>
            )}
            {hub ? (
                // One unified world: the ring sits at the origin, the music
                // section lives along the MUSIC ray (θ=0), rotated to face the
                // approaching camera. local → world: rotY(π), then -sectionDist.
                <group ref={sectionRef} rotation={[0, Math.PI, 0]} position={[0, 0, -hub.cfg.sectionDist]}>
                    {sectionContent}
                </group>
            ) : (
                sectionContent
            )}
        </>
    );
};

// ================ playlist player ================

const FAKE_BARS = Array.from({ length: 48 }).map((_, i) => {
    const v = Math.sin(i * 0.55) * 0.5 + Math.sin(i * 1.3) * 0.3 + 0.5;
    return Math.max(0.18, Math.min(1, v));
});

const WAVE_BINS = 48;

const waveformCache = new Map();

const analyzeWaveform = async (url, bins = WAVE_BINS) => {
    if (!url) return null;
    if (waveformCache.has(url)) return waveformCache.get(url);
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const ctx = new Ctx();
        const res = await fetch(url);
        if (!res.ok) { ctx.close?.(); return null; }
        const buf = await res.arrayBuffer();
        const audio = await ctx.decodeAudioData(buf);
        const data = audio.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / bins));
        const out = new Array(bins);
        let max = 0;
        for (let i = 0; i < bins; i++) {
            let sum = 0;
            const start = i * step;
            const end = Math.min(data.length, start + step);
            for (let j = start; j < end; j++) {
                const v = data[j] || 0;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / Math.max(1, end - start));
            out[i] = rms;
            if (rms > max) max = rms;
        }
        const normalized = out.map((v) => Math.max(0.12, max > 0 ? v / max : 0.5));
        waveformCache.set(url, normalized);
        ctx.close?.();
        return normalized;
    } catch { return null; }
};

const getTrackUrl = (t) => t?.audioFile || t?.audioUrl || t?.audio || t?.url || '';
const getTrackTitle = (t, i) => t?.title || `TRACK ${String(i + 1).padStart(2, '0')}`;
const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const usePlaylistPlayer = (tracks) => {
    const audioRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [waveform, setWaveform] = useState(null);
    const trackCount = tracks.length;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const a = new Audio();
        a.preload = 'metadata';
        audioRef.current = a;
        return () => {
            try { a.pause(); a.src = ''; } catch { /* ignore */ }
        };
    }, []);

    const currentTrack = trackCount > 0 ? tracks[currentIndex % trackCount] : null;
    const currentUrl = getTrackUrl(currentTrack);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        const onTime = () => {
            if (a.duration > 0) setProgress(a.currentTime / a.duration);
        };
        const onMeta = () => setDuration(a.duration || 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnd = () => {
            setPlaying(false);
            if (trackCount > 1) {
                setCurrentIndex((i) => (i + 1) % trackCount);
            }
        };
        a.addEventListener('timeupdate', onTime);
        a.addEventListener('loadedmetadata', onMeta);
        a.addEventListener('play', onPlay);
        a.addEventListener('pause', onPause);
        a.addEventListener('ended', onEnd);
        return () => {
            a.removeEventListener('timeupdate', onTime);
            a.removeEventListener('loadedmetadata', onMeta);
            a.removeEventListener('play', onPlay);
            a.removeEventListener('pause', onPause);
            a.removeEventListener('ended', onEnd);
        };
    }, [trackCount]);

    // Track change: load new src + waveform
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        setProgress(0);
        setWaveform(null);
        setDuration(0);
        if (!currentUrl) {
            try { a.pause(); a.removeAttribute('src'); a.load(); } catch { /* ignore */ }
            return;
        }
        try { a.src = currentUrl; a.load(); } catch { /* ignore */ }
        let cancelled = false;
        analyzeWaveform(currentUrl).then((w) => { if (!cancelled && w) setWaveform(w); });
        return () => { cancelled = true; };
    }, [currentUrl]);

    const toggle = useCallback(() => {
        const a = audioRef.current;
        if (!a || !currentUrl) return;
        if (a.paused) {
            a.play().catch(() => setPlaying(false));
        } else {
            a.pause();
        }
    }, [currentUrl]);

    const next = useCallback(() => {
        if (trackCount < 2) return;
        setCurrentIndex((i) => (i + 1) % trackCount);
    }, [trackCount]);

    const prev = useCallback(() => {
        if (trackCount < 2) return;
        setCurrentIndex((i) => (i - 1 + trackCount) % trackCount);
    }, [trackCount]);

    const seek = useCallback((rel) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        a.currentTime = rel * a.duration;
        if (a.paused) a.play().catch(() => setPlaying(false));
    }, []);

    const playIndex = useCallback((idx) => {
        if (idx < 0 || idx >= trackCount) return;
        setCurrentIndex(idx);
        // play after src change in next tick
        const a = audioRef.current;
        if (a) {
            const onCanPlay = () => {
                a.removeEventListener('canplay', onCanPlay);
                a.play().catch(() => setPlaying(false));
            };
            a.addEventListener('canplay', onCanPlay);
        }
    }, [trackCount]);

    return {
        currentIndex,
        currentTrack,
        currentUrl,
        playing,
        progress,
        duration,
        waveform,
        toggle, next, prev, seek, playIndex,
    };
};

const PlayPauseIcon = ({ playing }) => (
    playing ? (
        <svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
    ) : (
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 4 L20 12 L7 20 Z" fill="currentColor" /></svg>
    )
);

const PlayingPulse = () => (
    <span className="hn-pulse" aria-hidden="true">
        <span /><span /><span />
    </span>
);

const Player = ({ release }) => {
    const tracks = useMemo(() => (release?.tracks?.length ? release.tracks : []), [release]);
    const releaseTitle = release ? `${release.artists || ''} — ${release.title || ''}`.replace(/^—\s*|\s*—\s*$/g, '') : '';
    const player = usePlaylistPlayer(tracks);
    const [expanded, setExpanded] = useState(false);
    const hasTracks = tracks.length > 0;
    const bars = player.waveform || FAKE_BARS;
    const liveTitle = player.currentTrack ? `${player.currentTrack.artist || release?.artists || ''} — ${getTrackTitle(player.currentTrack, player.currentIndex)}`.replace(/^—\s*|\s*—\s*$/g, '') : '';
    const title = liveTitle || releaseTitle;

    const onWaveClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        player.seek(rel);
    };

    return (
        <div className={`hn-player${expanded ? ' expanded' : ''}`}>
            <AnimatePresence initial={false}>
                {expanded && hasTracks && (
                    <motion.div
                        key="drawer"
                        className="hn-player-drawer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                    >
                        <div className="hn-player-drawer-inner">
                            <div className="hn-player-drawer-head">
                                <span>NOW PLAYING</span>
                                <span>{tracks.length} {tracks.length === 1 ? 'TRACK' : 'TRACKS'}</span>
                            </div>
                            <ul className="hn-player-tracks">
                                {tracks.map((t, i) => {
                                    const active = i === player.currentIndex;
                                    const url = getTrackUrl(t);
                                    return (
                                        <li
                                            key={t.id || i}
                                            className={`hn-player-track${active ? ' active' : ''}${!url ? ' disabled' : ''}`}
                                            onClick={() => url && player.playIndex(i)}
                                        >
                                            <span className="hn-player-track-num">{String(i + 1).padStart(2, '0')}</span>
                                            <span className="hn-player-track-title">{getTrackTitle(t, i)}</span>
                                            <span className="hn-player-track-meta">
                                                {active && player.playing ? <PlayingPulse /> : (t.duration || formatTime(active ? player.duration : 0) || '')}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="hn-player-bar-row">
                <button
                    className="hn-player-nav"
                    onClick={player.prev}
                    disabled={tracks.length < 2}
                    aria-label="Previous track"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>

                <div className="hn-player-pill">
                    <div className="hn-player-title">{title || 'NO TRACK'}</div>
                    <div className="hn-player-row">
                        <button
                            className="hn-player-play"
                            onClick={player.toggle}
                            disabled={!player.currentUrl}
                            aria-label={player.playing ? 'Pause' : 'Play'}
                        >
                            <PlayPauseIcon playing={player.playing} />
                        </button>

                        <div
                            className="hn-player-wave"
                            role="slider"
                            aria-label="Track position"
                            aria-valuemin={0}
                            aria-valuemax={1}
                            aria-valuenow={player.progress}
                            onClick={player.currentUrl ? onWaveClick : undefined}
                        >
                            {bars.map((h, i) => {
                                const pos = (i + 0.5) / bars.length;
                                const played = pos <= player.progress;
                                return (
                                    <span
                                        key={i}
                                        className={`hn-player-bar${played ? ' played' : ''}`}
                                        style={{ height: `${h * 100}%` }}
                                    />
                                );
                            })}
                        </div>

                        <button
                            className="hn-player-expand"
                            onClick={() => setExpanded((v) => !v)}
                            disabled={!hasTracks}
                            aria-label={expanded ? 'Collapse playlist' : 'Expand playlist'}
                            aria-expanded={expanded}
                        >
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s ease' }}>
                                <path d="M6 14 L12 8 L18 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                    </div>
                </div>

                <button
                    className="hn-player-nav"
                    onClick={player.next}
                    disabled={tracks.length < 2}
                    aria-label="Next track"
                >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ================ mix switcher ================

const MixSwitcher = ({ mixes, currentIndex, onIndex, playing, onTogglePlay }) => {
    const mix = mixes?.[currentIndex];
    const title = mix ? `${mix.artists ? mix.artists + ' — ' : ''}${mix.title || ''}`.trim() : 'NO MIX';
    const canPrev = mixes?.length > 1;
    const canNext = mixes?.length > 1;
    const prev = () => onIndex((currentIndex - 1 + mixes.length) % mixes.length);
    const next = () => onIndex((currentIndex + 1) % mixes.length);
    return (
        <div className="hn-player">
            <div className="hn-player-bar-row">
                <button className="hn-player-nav" onClick={prev} disabled={!canPrev} aria-label="Previous mix">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
                <div className="hn-player-pill">
                    <div className="hn-player-title">{title}</div>
                    <div className="hn-player-row">
                        <button
                            className="hn-player-play"
                            onClick={onTogglePlay}
                            disabled={!mix?.youtubeUrl}
                            aria-label={playing ? 'Pause mix' : 'Play mix'}
                        >
                            <PlayPauseIcon playing={playing} />
                        </button>
                        <div className="hn-mix-meta">
                            <span>MIX {String(currentIndex + 1).padStart(2, '0')} / {String(mixes.length).padStart(2, '0')}</span>
                            {mix?.recordDate && <span>{mix.recordDate}</span>}
                        </div>
                    </div>
                </div>
                <button className="hn-player-nav" onClick={next} disabled={!canNext} aria-label="Next mix">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ================ bottom action ================

const BottomAction = ({ label, href, onPrev, onNext, canPrev, canNext, light = false }) => {
    const onClick = () => {
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
    };
    return (
        <div className={`hn-player${light ? ' hn-player-light' : ''}`}>
            <div className="hn-player-bar-row">
                <button className="hn-player-nav" onClick={onPrev} disabled={!canPrev} aria-label="Previous">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>

                <button className="hn-action-pill" onClick={onClick}>{label}</button>

                <button className="hn-player-nav" onClick={onNext} disabled={!canNext} aria-label="Next">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

// ================ debug panel ================

const Row = ({ label, value, onChange, min = -30, max = 30, step = 0.1 }) => (
    <div className="dbg-row">
        <span className="dbg-label">{label}</span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="dbg-num" />
    </div>
);

const SelectRow = ({ label, value, onChange, options }) => (
    <label className="dbg-select-row">
        <span className="dbg-label">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
            ))}
        </select>
    </label>
);

const Vec3Block = ({ title, vec, setVec }) => (
    <div className="dbg-block">
        <div className="dbg-title">{title}</div>
        {['x', 'y', 'z'].map((k) => (
            <Row key={k} label={k.toUpperCase()} value={vec[k]} onChange={(v) => setVec({ ...vec, [k]: v })} />
        ))}
    </div>
);

const DebugPanel = ({
    cfg, setCfg, currentIndex, goTo, progressRef, onSaveToServer, onResetServer,
    hubMode = false, hubPhase = 'section', sectionKey = 'music', sectionEntryStop = 0,
    simple = false, hasTv = false, hideBillboard = false, showCodeCaption = false,
    tunerItems = [], tunerItemIndex = 0, tunerScope = 'item', onTunerItem,
    visibleStopCount = null,
}) => {
    const [open, setOpen] = useState(true);
    const [editIdx, setEditIdx] = useState(currentIndex);
    const [progress, setProgress] = useState(0);
    const [tunerPage, setTunerPage] = useState(0);
    const [tunerPageCount, setTunerPageCount] = useState(1);
    const panelRef = useRef(null);
    const pageViewportRef = useRef(null);
    const lastPageWheelRef = useRef(0);
    const inMenu = hubMode && hubPhase === 'menu';
    const inTransition = hubMode && hubPhase === 'travel';
    const inSection = !hubMode || hubPhase === 'section';
    const tunerStopCount = visibleStopCount ?? cfg.stops.length;

    useEffect(() => { setEditIdx(currentIndex); }, [currentIndex]);

    useLayoutEffect(() => {
        if (!open || !pageViewportRef.current) return undefined;
        const viewport = pageViewportRef.current;
        const measure = () => {
            const count = Math.max(1, Math.ceil(viewport.scrollHeight / Math.max(1, viewport.clientHeight)));
            setTunerPageCount(count);
            setTunerPage((current) => Math.min(current, count - 1));
        };
        const frameId = requestAnimationFrame(measure);
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
        return () => {
            cancelAnimationFrame(frameId);
            observer.disconnect();
        };
    }, [open, inMenu, inTransition, inSection, editIdx, sectionKey, hasTv, simple, hideBillboard, showCodeCaption, tunerScope, tunerItemIndex, tunerStopCount]);

    useEffect(() => {
        const viewport = pageViewportRef.current;
        if (!viewport) return;
        viewport.scrollTo({ top: tunerPage * viewport.clientHeight, behavior: 'smooth' });
    }, [tunerPage]);

    useEffect(() => {
        setTunerPage(0);
    }, [inMenu, inTransition, inSection, editIdx, sectionKey, tunerScope, tunerItemIndex]);

    useEffect(() => {
        const panel = panelRef.current;
        if (!panel) return undefined;
        const stopSceneGesture = (event) => {
            event.stopPropagation();
            if (event.type !== 'wheel') return;
            event.preventDefault();
            if (!event.target.closest('.dbg-page-viewport') || Math.abs(event.deltaY) < 8) return;
            const now = Date.now();
            if (now - lastPageWheelRef.current < 320) return;
            lastPageWheelRef.current = now;
            setTunerPage((current) => Math.max(0, Math.min(tunerPageCount - 1, current + (event.deltaY > 0 ? 1 : -1))));
        };
        panel.addEventListener('wheel', stopSceneGesture, { passive: false });
        panel.addEventListener('touchstart', stopSceneGesture, { passive: true });
        panel.addEventListener('touchmove', stopSceneGesture, { passive: true });
        panel.addEventListener('touchend', stopSceneGesture, { passive: true });
        return () => {
            panel.removeEventListener('wheel', stopSceneGesture);
            panel.removeEventListener('touchstart', stopSceneGesture);
            panel.removeEventListener('touchmove', stopSceneGesture);
            panel.removeEventListener('touchend', stopSceneGesture);
        };
    }, [tunerPageCount]);

    useEffect(() => {
        let raf;
        const loop = () => {
            setProgress(progressRef.current || 0);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [progressRef]);

    const updateStop = (idx, patch) => {
        const stops = cfg.stops.map((s, i) => (i === idx ? { ...s, ...patch } : s));
        setCfg({ ...cfg, stops });
    };

    const stop = cfg.stops[editIdx];
    const contextLabel = inMenu
        ? 'menu'
        : inTransition
            ? 'transition'
            : `${sectionKey} · frame ${editIdx - sectionEntryStop + 1}`;

    const [savedFlash, setSavedFlash] = useState(false);
    const exportCfg = () => {
        const txt = JSON.stringify(cfg, null, 2);
        navigator.clipboard?.writeText(txt);
        console.log('camera config:', cfg);
    };
    const saveCfg = async () => {
        try {
            await onSaveToServer?.(cfg);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 900);
        } catch (e) { console.error('save failed', e); }
    };
    const clearSaved = async () => {
        await onResetServer?.();
    };

    if (!open) return <button className="dbg-toggle" onClick={() => setOpen(true)}>cam</button>;

    return (
        <div className="dbg-panel" ref={panelRef}>
            <div className="dbg-head">
                <span>camera tuner · {contextLabel}</span>
                <span className="dbg-progress">{(progress * 100).toFixed(0)}%</span>
                <button onClick={saveCfg} className={`dbg-btn dbg-btn-primary ${savedFlash ? 'flash' : ''}`}>{savedFlash ? 'saved!' : 'save'}</button>
                <button onClick={clearSaved} className="dbg-btn">reset</button>
                <button onClick={exportCfg} className="dbg-btn">copy</button>
                <button onClick={() => setOpen(false)} className="dbg-btn">×</button>
            </div>

            <div className="dbg-page-viewport" ref={pageViewportRef}>
            <div className="dbg-page-content">

            {inSection && tunerItems.length > 0 && (
                <label className="dbg-select-row">
                    <span className="dbg-label">item</span>
                    <select
                        value={tunerScope === 'section' ? 'section' : `item:${tunerItemIndex}`}
                        onChange={(e) => onTunerItem?.(e.target.value)}
                    >
                        <option value="section">SECTION DEFAULT</option>
                        {tunerItems.map((item, index) => (
                            <option key={sceneItemKey(item, index)} value={`item:${index}`}>
                                {String(index + 1).padStart(2, '0')} · {item.title || item.name || `Item ${index + 1}`}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {inSection && <div className="dbg-stops">
                {cfg.stops.map((_, i) => i >= sectionEntryStop && i < tunerStopCount && (
                    <button
                        key={i}
                        onClick={() => { goTo(i); setEditIdx(i); }}
                        className={`dbg-stop ${currentIndex === i ? 'active' : ''} ${editIdx === i ? 'editing' : ''}`}
                    >
                        frame {i - sectionEntryStop + 1}
                    </button>
                ))}
            </div>}

            {inSection && <div className="dbg-edit-hint">camera and objects visible in this frame</div>}

            {inMenu && (
                <div className="dbg-block">
                    <div className="dbg-title">hub menu (ring)</div>
                    <Row label="ring r"   value={cfg.hub?.ringRadius ?? 9}  min={4}   max={24}  step={0.1}  onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, ringRadius: v } })} />
                    {window.matchMedia('(min-width: 769px)').matches ? (
                        <Row label="cam dist desktop" value={cfg.hub?.camDistDesktop ?? 9.5} min={3} max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, camDistDesktop: v } })} />
                    ) : (
                        <Row label="cam dist mobile" value={cfg.hub?.camDistMobile ?? 11} min={3} max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, camDistMobile: v } })} />
                    )}
                    <Row label="cam y"    value={cfg.hub?.camY ?? 2.6}      min={0.2} max={10}  step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, camY: v } })} />
                    <Row label="look y"   value={cfg.hub?.lookY ?? 2.5}     min={0}   max={8}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, lookY: v } })} />
                    <Row label="fov"      value={cfg.hub?.fov ?? 50}        min={25}  max={100} step={1}    onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, fov: v } })} />
                    <Row label="sect dist" value={cfg.hub?.sectionDist ?? 56} min={24} max={140} step={1}   onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, sectionDist: v } })} />
                    <Row label="item sz"  value={cfg.hub?.itemSize ?? 3.4}  min={1}   max={7}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, itemSize: v } })} />
                    <Row label="item y"   value={cfg.hub?.itemY ?? 2.45}    min={0}   max={6}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, itemY: v } })} />
                    <Row label="caption gap" value={cfg.hub?.captionOffset ?? DEFAULT_HUB.captionOffset} min={-8} max={8} step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, captionOffset: v } })} />
                    <Row label="caption y" value={cfg.hub?.captionY ?? DEFAULT_HUB.captionY} min={-1} max={5} step={0.02} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, captionY: v } })} />
                    <Row label="caption tilt" value={cfg.hub?.captionTilt ?? DEFAULT_HUB.captionTilt} min={-90} max={90} step={1} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, captionTilt: v } })} />
                    <Row label="caption size" value={cfg.hub?.captionSize ?? DEFAULT_HUB.captionSize} min={0.05} max={2} step={0.01} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, captionSize: v } })} />
                    <Row label="travel s" value={cfg.hub?.travelDur ?? 1.8} min={0.5} max={5}   step={0.1}  onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, travelDur: v } })} />
                </div>
            )}

            {inTransition && (
                <div className="dbg-block">
                    <div className="dbg-title">menu → section transition</div>
                    <Row label="duration" value={cfg.hub?.travelDur ?? 1.8} min={0.5} max={5} step={0.1} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, travelDur: v } })} />
                    <Row label="distance" value={cfg.hub?.sectionDist ?? 56} min={24} max={140} step={1} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, sectionDist: v } })} />
                </div>
            )}

            {inSection && <Vec3Block title="camera position" vec={stop.pos} setVec={(v) => updateStop(editIdx, { pos: v })} />}
            {inSection && <Vec3Block title="camera look at"  vec={stop.look} setVec={(v) => updateStop(editIdx, { look: v })} />}

            {inSection && <div className="dbg-block">
                <div className="dbg-title">fov · stop {editIdx}</div>
                <Row label="fov" value={stop.fov} min={10} max={120} step={1} onChange={(v) => updateStop(editIdx, { fov: v })} />
            </div>}

            {inSection && editIdx === 0 && !hideBillboard && <div className="dbg-block">
                <div className="dbg-title">billboard</div>
                <Row label="cov sz" value={cfg.billboard.coverSize}  min={0.5} max={6}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, coverSize: v } })} />
                <Row label="cov y"  value={cfg.billboard.coverY}     min={-3}  max={3}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, coverY: v } })} />
                <Row label="ttl y"  value={cfg.billboard.titleY}     min={-3}  max={5}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, titleY: v } })} />
                <Row label="ttl z"  value={cfg.billboard.titleZ}     min={-3}  max={3}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, titleZ: v } })} />
                <Row label="ttl sz" value={cfg.billboard.titleSize}  min={0.1} max={3}  step={0.02} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, titleSize: v } })} />
                <SelectRow label="title font" value={cfg.billboard.titleFont} options={RELEASE_FONT_OPTIONS} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, titleFont: v } })} />
                <Row label="art y"  value={cfg.billboard.artistY}    min={-3}  max={5}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistY: v } })} />
                <Row label="art z"  value={cfg.billboard.artistZ}    min={-3}  max={3}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistZ: v } })} />
                <Row label="art sz" value={cfg.billboard.artistSize} min={0.1} max={2}  step={0.02} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistSize: v } })} />
                <SelectRow label="artist font" value={cfg.billboard.artistFont} options={RELEASE_FONT_OPTIONS} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistFont: v } })} />
            </div>}

            {inSection && editIdx === sectionEntryStop && showCodeCaption && <div className="dbg-block">
                <div className="dbg-title">code short description</div>
                <Row label="x" value={cfg.codeCaption.pos.x} min={-15} max={15} step={0.05} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, pos: { ...cfg.codeCaption.pos, x: v } } })} />
                <Row label="y" value={cfg.codeCaption.pos.y} min={-2} max={8} step={0.01} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, pos: { ...cfg.codeCaption.pos, y: v } } })} />
                <Row label="z" value={cfg.codeCaption.pos.z} min={-15} max={20} step={0.05} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, pos: { ...cfg.codeCaption.pos, z: v } } })} />
                <Row label="tilt" value={cfg.codeCaption.tilt} min={-90} max={90} step={1} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, tilt: v } })} />
                <Row label="turn" value={cfg.codeCaption.rotation} min={-180} max={180} step={1} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, rotation: v } })} />
                <Row label="scale" value={cfg.codeCaption.scale} min={0.5} max={15} step={0.1} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, scale: v } })} />
                <Row label="width" value={cfg.codeCaption.width} min={160} max={900} step={10} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, width: v } })} />
                <Row label="font" value={cfg.codeCaption.fontSize} min={8} max={40} step={1} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, fontSize: v } })} />
                <Row label="line" value={cfg.codeCaption.lineHeight} min={0.8} max={2.5} step={0.05} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, lineHeight: v } })} />
                <Row label="space" value={cfg.codeCaption.letterSpacing} min={0} max={0.5} step={0.01} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, letterSpacing: v } })} />
                <Row label="height" value={cfg.codeCaption.maxHeight} min={1} max={30} step={0.5} onChange={(v) => setCfg({ ...cfg, codeCaption: { ...cfg.codeCaption, maxHeight: v } })} />
            </div>}

            {inSection && editIdx === 2 && !simple && <div className="dbg-block">
                <div className="dbg-title">stack (links)</div>
                <Row label="x"      value={cfg.stack.pos.x}  min={-15} max={15} step={0.1} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, x: v } } })} />
                <Row label="y"      value={cfg.stack.pos.y}  min={-3}  max={10} step={0.05} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, y: v } } })} />
                <Row label="z"      value={cfg.stack.pos.z}  min={-5}  max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, z: v } } })} />
                <Row label="size"   value={cfg.stack.boxSize} min={0.2} max={2} step={0.02} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, boxSize: v } })} />
                <Row label="gap"    value={cfg.stack.gap}     min={0}   max={0.5} step={0.01} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, gap: v } })} />
            </div>}

            {inSection && editIdx === 2 && !simple && <div className="dbg-block">
                <div className="dbg-title">support text</div>
                <Row label="x"        value={cfg.support.pos.x}    min={-15} max={15} step={0.1} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, x: v } } })} />
                <Row label="y"        value={cfg.support.pos.y}    min={-1}  max={3}  step={0.01} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, y: v } } })} />
                <Row label="z"        value={cfg.support.pos.z}    min={-5}  max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, z: v } } })} />
                <Row label="meta sz"  value={cfg.support.metaSize} min={0.1} max={1}  step={0.02} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, metaSize: v } })} />
                <Row label="text sz"  value={cfg.support.fontSize} min={0.1} max={2}  step={0.02} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, fontSize: v } })} />
            </div>}

            {inSection && editIdx === 0 && hasTv && <div className="dbg-block">
                <div className="dbg-title">tv (mixes)</div>
                <Row label="x"     value={cfg.tv.pos.x}  min={-15} max={15} step={0.05} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, pos: { ...cfg.tv.pos, x: v } } })} />
                <Row label="y"     value={cfg.tv.pos.y}  min={-3}  max={10} step={0.05} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, pos: { ...cfg.tv.pos, y: v } } })} />
                <Row label="z"     value={cfg.tv.pos.z}  min={-5}  max={30} step={0.05} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, pos: { ...cfg.tv.pos, z: v } } })} />
                <Row label="scale" value={cfg.tv.scale}  min={1}   max={20} step={0.05} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, scale: v } })} />
                <Row label="iframe x" value={cfg.tv.iframeShift.x} min={-3} max={3} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, iframeShift: { ...cfg.tv.iframeShift, x: v } } })} />
                <Row label="iframe y" value={cfg.tv.iframeShift.y} min={-3} max={3} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, iframeShift: { ...cfg.tv.iframeShift, y: v } } })} />
                <Row label="iframe z" value={cfg.tv.iframeShift.z || 0} min={-2} max={2} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, iframeShift: { ...cfg.tv.iframeShift, z: v } } })} />
                <Row label="iframe scale" value={cfg.tv.iframeScale} min={1} max={200} step={0.5} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, iframeScale: v } })} />
                <Row label="play stop0 z" value={cfg.tv.playStop0Z ?? 5.6} min={-5} max={30} step={0.05} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, playStop0Z: v } })} />
                <Row label="screen x0" value={cfg.tv.screen.x0} min={0} max={1} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, screen: { ...cfg.tv.screen, x0: v } } })} />
                <Row label="screen x1" value={cfg.tv.screen.x1} min={0} max={1} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, screen: { ...cfg.tv.screen, x1: v } } })} />
                <Row label="screen y0" value={cfg.tv.screen.y0} min={0} max={1} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, screen: { ...cfg.tv.screen, y0: v } } })} />
                <Row label="screen y1" value={cfg.tv.screen.y1} min={0} max={1} step={0.005} onChange={(v) => setCfg({ ...cfg, tv: { ...cfg.tv, screen: { ...cfg.tv.screen, y1: v } } })} />
            </div>}

            {inSection && editIdx === 1 && <div className="dbg-block">
                <div className="dbg-title">captions and photos</div>
                <Row label="floor txt z" value={cfg.floorTextZ} min={-15} max={20} onChange={(v) => setCfg({ ...cfg, floorTextZ: v })} />
                <Row label="photo z"     value={cfg.photoZ}     min={-15} max={20} onChange={(v) => setCfg({ ...cfg, photoZ: v })} />
            </div>}

            {inSection && editIdx === tunerStopCount - 1 && <div className="dbg-block">
                <div className="dbg-title">scene depth</div>
                <Row label="fog near"    value={cfg.fogNear}    min={0}   max={50} step={0.5} onChange={(v) => setCfg({ ...cfg, fogNear: v })} />
                <Row label="fog far"     value={cfg.fogFar}     min={5}   max={120} step={1} onChange={(v) => setCfg({ ...cfg, fogFar: v })} />
            </div>}
            </div>
            </div>

            <div className="dbg-pagination">
                <button
                    type="button"
                    className="dbg-page-btn"
                    onClick={() => setTunerPage((current) => Math.max(0, current - 1))}
                    disabled={tunerPage === 0}
                    aria-label="Previous tuner page"
                >
                    ‹
                </button>
                <span>page {tunerPage + 1} / {tunerPageCount}</span>
                <button
                    type="button"
                    className="dbg-page-btn"
                    onClick={() => setTunerPage((current) => Math.min(tunerPageCount - 1, current + 1))}
                    disabled={tunerPage >= tunerPageCount - 1}
                    aria-label="Next tuner page"
                >
                    ›
                </button>
            </div>
        </div>
    );
};

const StopIndicator = ({ count, currentIndex, goTo, startIndex = 0 }) => (
    <div className="hn-dots" aria-hidden="true">
        {Array.from({ length: Math.max(0, count - startIndex) }).map((_, offset) => {
            const i = offset + startIndex;
            return (
            <button
                key={i}
                className={`hn-dot ${currentIndex === i ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to stop ${i + 1}`}
            />
            );
        })}
    </div>
);

// ================ shell ================

// Configurable 3D shell. Accepts a flat list of "items" (release-like records:
// title, artists, description, releaseDate, coverImage, *Url). When `simple`,
// the platform stack, support text and player are hidden — useful for
// non-music pages that only need the billboard + floor text. cfgStorageKey
// scopes the camera/billboard tuner config per page so /about can be tuned
// independently from /. serverCfgKey, when provided, also persists the cfg
// into siteSettings under that key (used only by the music home for now).
export const Scene3DShell = ({
    items: itemsProp = null,
    simple = false,
    cfgStorageKey = CFG_STORAGE_KEY,
    serverCfgKey = null,
    stopCount = 4,
    showDebug = false,
    bottomAction = null,
    portfolio = null,
    richText = false,
    tvMixes = null,
    hub = false,
    initialKey = null,
    initialStop = 0,
    defaultStopOffset = 0,
    returnToHubKey = null,
    initialReleaseSlug = null,
}) => {
    const { releases, mixes, projects, about, siteSettings, updateSiteSettings, isLoaded } = useData();
    const navigate = useNavigate();
    const deviceTiltRef = useDeviceTilt(siteSettings?.deviceTilt);

    const displayItems = React.useMemo(() => {
        const source = itemsProp ?? releases;
        const sorted = (source || [])
            .filter((item) => item.active !== false)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        return sorted;
    }, [itemsProp, releases]);

    const initialCfg = useMemo(() => ({
        ...DEFAULT_CFG,
        stops: buildDefaultStops(stopCount + defaultStopOffset).slice(defaultStopOffset),
    }), [stopCount, defaultStopOffset]);

    const [cfg, setCfg] = useState(initialCfg);
    const [cfgReady, setCfgReady] = useState(false);
    const cfgRef = useRef(cfg);

    // ---- hub (3D ring menu) state ----
    // Returning from a foreign section: the initializer only READS (StrictMode
    // double-invokes initializers, so a destructive read here would eat the
    // token on the first invocation); the idempotent delete happens in an effect.
    const [hubInit] = useState(() => {
        if (!hub) return null;
        if (initialKey && HUB_IN_CANVAS.has(initialKey)) {
            const idx = Math.max(0, HUB_ITEMS.findIndex((item) => item.key === initialKey));
            return { idx, returning: false, entered: initialKey };
        }
        let info = null;
        try {
            const raw = sessionStorage.getItem(HUB_RETURN_KEY);
            if (raw) {
                const v = JSON.parse(raw);
                if (v?.key && Date.now() - (v.ts || 0) < 3600000) info = v;
            }
        } catch { /* ignore */ }
        const idx = info ? Math.max(0, HUB_ITEMS.findIndex((m) => m.key === info.key)) : 0;
        return { idx, returning: !!info, entered: null };
    });
    useEffect(() => {
        if (!hub) return;
        try { sessionStorage.removeItem(HUB_RETURN_KEY); } catch { /* ignore */ }
    }, [hub]);
    const hubStateRef = useRef(hub ? {
        phase: hubInit.entered ? 'section' : (hubInit.returning ? 'foreign' : 'menu'),
        tt: (hubInit.entered || hubInit.returning) ? 1 : 0,
        dir: hubInit.returning ? -1 : 0,
        menuIndex: hubInit.idx + HUB_ITEMS.length,
        angle: (hubInit.idx + HUB_ITEMS.length) * HUB_SPACING,
        foreignKey: null,
        done: false,
    } : null);
    const [hubPhase, setHubPhase] = useState(() => (hub ? hubStateRef.current.phase : 'section'));
    const [ringIndex, setRingIndex] = useState(hubInit?.idx ?? 0);
    const [activeKey, setActiveKey] = useState(hubInit?.entered || 'music');
    const activeStopCount = hub && activeKey === 'music' ? Math.min(3, stopCount) : stopCount;
    useLayoutEffect(() => {
        cfgRef.current = { ...cfg, stops: cfg.stops.slice(0, activeStopCount) };
    }, [activeStopCount, cfg]);
    const sectionControls = !hub || hubPhase === 'section';
    const cfgContext = hub && hubPhase === 'menu' ? 'menu' : activeKey;
    const activeServerCfgKey = cfgContext === 'menu'
        ? serverCfgKey
        : (HUB_SECTION_CONFIG_KEYS[cfgContext] || serverCfgKey);

    const musicSection = useMemo(() => ({
        items: displayItems,
        simple,
        tvMixes,
        portfolio,
        richText,
        bottomAction,
    }), [displayItems, simple, tvMixes, portfolio, richText, bottomAction]);

    const mixesItems = useMemo(() => {
        const source = mixes || [];
        return [...source]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((mix) => ({
                ...mix,
                artists: mix.artists || 'MUVS',
                releaseDate: mix.releaseDate || mix.recordDate || mix.date || '',
                coverImage: mix.coverImage || mix.backgroundImage || '',
            }));
    }, [mixes]);

    const codeItems = useMemo(() => {
        const source = projects || [];
        return [...source]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((project) => ({
                ...project,
                artists: project.artists || project.type || 'PROJECT',
                releaseDate: project.releaseDate || project.date || '',
                coverImage: project.coverImage || project.thumbnail || '',
                description: project.description || '',
                fullDescription: project.fullDescription || project.description || '',
            }));
    }, [projects]);

    const aboutItems = useMemo(() => (
        about?.title || about?.content || about?.backgroundImage
            ? [{
                id: about.id || 'about',
                title: about.title || '',
                artists: 'MUVS',
                description: about.content || '',
                releaseDate: '',
                coverImage: about.backgroundImage || '',
            }]
            : []
    ), [about]);

    const requestUrl = siteSettings?.socialLinks?.telegram || '';
    const hubSections = useMemo(() => ({
        music: musicSection,
        mixes: {
            items: mixesItems,
            simple: true,
            tvMixes: mixesItems,
            comingSoon: true,
            portfolio: null,
            richText: true,
            bottomAction: null,
        },
        code: {
            items: codeItems,
            simple: true,
            tvMixes: null,
            portfolio: null,
            richText: true,
            showCodeCaption: true,
            fullDescriptionOnly: true,
            bottomAction: { label: 'MAKE REQUEST', href: requestUrl },
        },
        about: {
            items: aboutItems,
            simple: true,
            tvMixes: null,
            portfolio: null,
            richText: false,
            bottomAction: { label: 'MAKE REQUEST', href: requestUrl },
            entryStop: 1,
            hideBillboard: true,
        },
    }), [musicSection, mixesItems, codeItems, aboutItems, requestUrl]);
    const activeSection = hub ? (hubSections[activeKey] || musicSection) : musicSection;
    const effectiveItems = activeSection.items;
    const sectionEntryStop = activeSection.entryStop ?? 0;
    const [mixIndex, setMixIndex] = useState(0);
    const [mixPlaying, setMixPlaying] = useState(false);
    const [tunerScope, setTunerScope] = useState('item');
    const effectiveMixes = activeSection.tvMixes;
    const currentMix = effectiveMixes?.[mixIndex] || null;

    const startTravelBack = useCallback(() => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'section') return;
        st.phase = 'travel';
        st.dir = -1;
        setHubPhase('travel');
    }, []);

    const returnToHub = useCallback(() => {
        if (!returnToHubKey) return;
        try {
            sessionStorage.setItem(HUB_RETURN_KEY, JSON.stringify({ key: returnToHubKey, ts: Date.now() }));
        } catch { /* ignore */ }
        navigate(ROUTES.HOME);
    }, [navigate, returnToHubKey]);

    const { progressRef, currentIndex, goTo } = useSnapScroll(activeStopCount, {
        enabled: sectionControls,
        onOverscrollUp: hub ? startTravelBack : (returnToHubKey ? returnToHub : undefined),
        initialIndex: hub && hubInit?.entered ? sectionEntryStop : initialStop,
        minIndex: hub ? sectionEntryStop : 0,
    });
    const releaseSwitcher = useReleaseSwitcher(
        effectiveItems.length,
        useCallback(() => goTo(0), [goTo]),
        { enabled: sectionControls },
    );
    const currentRelease = effectiveItems[Math.min(releaseSwitcher.current, effectiveItems.length - 1)];
    const tunerItemIndex = effectiveMixes ? mixIndex : releaseSwitcher.current;
    const tunerItem = effectiveMixes ? currentMix : currentRelease;
    const tunerItemKey = tunerItem ? sceneItemKey(tunerItem, tunerItemIndex) : null;
    const tunerConfigKey = tunerScope === 'item' ? tunerItemKey : null;

    useLayoutEffect(() => {
        if (!isLoaded) return;

        const legacyServerCfg = serverCfgKey ? siteSettings?.[serverCfgKey] : null;
        const sectionServerCfg = activeServerCfgKey ? siteSettings?.[activeServerCfgKey] : null;
        let localFallback = null;
        if (!activeServerCfgKey) {
            try {
                const raw = localStorage.getItem(cfgStorageKey);
                if (raw) localFallback = hydrateCfg(JSON.parse(raw), stopCount);
            } catch { /* ignore invalid legacy cache */ }
        }

        if (cfgContext === 'menu') {
            setCfg(hydrateCfg(sectionServerCfg, stopCount) || localFallback || initialCfg);
            setCfgReady(true);
            return;
        }

        const sectionCfg = hydrateCfg(sectionServerCfg, stopCount)
            || hydrateCfg(legacyServerCfg, stopCount)
            || localFallback
            || initialCfg;
        const itemCfg = tunerConfigKey
            ? hydrateCfg(siteSettings?.sceneItemConfigs?.[cfgContext]?.[tunerConfigKey], stopCount)
            : null;
        const menuCfg = hydrateCfg(legacyServerCfg, stopCount) || initialCfg;
        setCfg({ ...(itemCfg || sectionCfg), hub: menuCfg.hub || DEFAULT_HUB });
        setCfgReady(true);
    }, [
        activeServerCfgKey, cfgContext, cfgStorageKey, initialCfg, isLoaded,
        serverCfgKey, siteSettings, stopCount, tunerConfigKey,
    ]);

    const previousActiveKeyRef = useRef(activeKey);
    useEffect(() => {
        const sectionChanged = previousActiveKeyRef.current !== activeKey;
        previousActiveKeyRef.current = activeKey;
        if (sectionChanged) {
            releaseSwitcher.goTo(0);
            setTunerScope('item');
        }
        const nextStop = hub ? sectionEntryStop : initialStop;
        goTo(nextStop, true, nextStop);
    }, [activeKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const startTravelIn = useCallback((entryStop = 0) => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        goTo(entryStop, true, entryStop);
        st.phase = 'travel';
        st.dir = 1;
        st.tt = Math.max(0, st.tt);
        setHubPhase('travel');
    }, [goTo]);

    const startForeign = useCallback((item) => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        st.phase = 'foreign';
        st.dir = 1;
        st.tt = 0;
        st.done = false;
        st.foreignKey = item.key;
        setHubPhase('foreign');
    }, []);

    const hubEnter = useCallback(() => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        const item = HUB_ITEMS[hubMod(st.menuIndex)];
        if (HUB_IN_CANVAS.has(item.key)) {
            const entryStop = hubSections[item.key]?.entryStop ?? 0;
            setActiveKey(item.key);
            startTravelIn(entryStop);
        } else {
            startForeign(item);
        }
    }, [hubSections, startTravelIn, startForeign]);

    const hubRotateBy = useCallback((d) => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        st.menuIndex += d;
        setRingIndex(hubMod(st.menuIndex));
    }, []);

    const hubRotateByButton = useCallback((direction) => {
        const desktop = window.matchMedia('(min-width: 769px)').matches;
        hubRotateBy(desktop ? -direction : direction);
    }, [hubRotateBy]);

    const hubSelect = useCallback((index) => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        const current = hubMod(st.menuIndex);
        let d = index - current;
        if (d > HUB_ITEMS.length / 2) d -= HUB_ITEMS.length;
        if (d < -HUB_ITEMS.length / 2) d += HUB_ITEMS.length;
        if (d === 0) hubEnter();
        else hubRotateBy(d);
    }, [hubEnter, hubRotateBy]);

    const hubForeignLeft = useCallback(() => {
        const st = hubStateRef.current;
        const item = HUB_ITEMS.find((m) => m.key === st?.foreignKey) || HUB_ITEMS[hubMod(st?.menuIndex ?? 0)];
        try {
            sessionStorage.setItem(HUB_RETURN_KEY, JSON.stringify({ key: item.key, ts: Date.now() }));
        } catch { /* ignore */ }
        navigate(item.route);
    }, [navigate]);

    const hubOnPhase = useCallback((p) => setHubPhase(p), []);

    // Menu input mirrors the horizontal release switcher; a
    // deliberate downward scroll / upward swipe / Enter dives into the section.
    useEffect(() => {
        if (!hub || hubPhase !== 'menu') return undefined;
        const mountT = Date.now();
        let lastWheel = 0;
        let vAcc = 0;
        let vAccT = 0;

        const tryEnter = () => {
            if (Date.now() - mountT < 700) return;
            hubEnter();
        };

        const onWheel = (e) => {
            e.preventDefault();
            const ax = Math.abs(e.deltaX);
            const ay = Math.abs(e.deltaY);
            const now = Date.now();
            if (ax > ay) {
                if (now - lastWheel < 650 || ax < 6) return;
                lastWheel = now;
                hubRotateBy(e.deltaX > 0 ? 1 : -1);
            } else if (e.deltaY > 0) {
                if (now - vAccT > 500) vAcc = 0;
                vAccT = now;
                vAcc += e.deltaY;
                if (vAcc > 180) {
                    vAcc = 0;
                    tryEnter();
                }
            }
        };

        let touchY = null;
        let touchX = null;
        const onTouchStart = (e) => {
            if (e.touches.length > 1) { touchY = null; touchX = null; return; }
            touchY = e.touches[0].clientY;
            touchX = e.touches[0].clientX;
        };
        const onTouchMove = (e) => {
            if (e.touches.length > 1) { touchY = null; touchX = null; }
        };
        const onTouchEnd = (e) => {
            if (touchY == null) return;
            const endY = e.changedTouches[0]?.clientY ?? touchY;
            const endX = e.changedTouches[0]?.clientX ?? touchX;
            const dy = touchY - endY;
            const dx = touchX - endX;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                hubRotateBy(dx > 0 ? -1 : 1);
            } else if (dy > Math.abs(dx) && dy > 70) {
                tryEnter();
            }
            touchY = null;
            touchX = null;
        };

        const onKey = (e) => {
            if (e.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                hubRotateBy(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                hubRotateBy(-1);
            } else if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                tryEnter();
            }
        };

        window.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKey);
        };
    }, [hub, hubPhase, hubEnter, hubRotateBy]);

    const hubCovers = useMemo(() => {
        if (!hub) return null;
        const menuCovers = {
            music: '/images/menu/music2.webp',
            mixes: '/images/menu/mixes-trans.webp',
            code: '/images/menu/code2.webp',
            about: null,
        };
        const releaseCovers = HUB_ITEMS.map((_, i) => {
            const r = displayItems.length ? displayItems[i % displayItems.length] : null;
            return r?.coverImage || '/images/logo.png';
        });
        return HUB_ITEMS.map((item, i) => {
            if (Object.hasOwn(menuCovers, item.key)) return menuCovers[item.key];
            return releaseCovers[i];
        });
    }, [hub, displayItems]);

    useEffect(() => {
        (hubCovers || []).filter(Boolean).forEach((url) => {
            preloadImage(url, 'high');
        });
    }, [hubCovers]);

    useEffect(() => {
        [displayItems[0], mixesItems[0], codeItems[0], aboutItems[0]]
            .map(primaryItemImage)
            .filter(Boolean)
            .forEach((url) => preloadImage(url, 'low'));
    }, [aboutItems, codeItems, displayItems, mixesItems]);

    useEffect(() => {
        const center = effectiveMixes ? mixIndex : releaseSwitcher.current;
        [center - 1, center, center + 1]
            .filter((index) => index >= 0 && index < effectiveItems.length)
            .flatMap((index) => itemImageUrls(effectiveItems[index]))
            .forEach((url) => preloadImage(url, 'auto'));
    }, [effectiveItems, effectiveMixes, mixIndex, releaseSwitcher.current]);

    const hubProps = hub ? {
        cfg: cfg.hub || DEFAULT_HUB,
        covers: hubCovers,
        captions: siteSettings?.menuCaptions,
        particleSettings: siteSettings?.menuParticles,
        phase: hubPhase,
        activeIndex: ringIndex,
        stateRef: hubStateRef,
        onSelect: hubSelect,
        onPhase: hubOnPhase,
        onForeignLeft: hubForeignLeft,
    } : null;

    // Deep link: prefer the clean /:slug route, but keep legacy #slug links.
    const hashNavigatedRef = useRef(false);
    useEffect(() => {
        if (hashNavigatedRef.current || !effectiveItems.length) return;
        hashNavigatedRef.current = true;
        let requestedSlug = initialReleaseSlug || window.location.hash.replace(/^#/, '');
        try { requestedSlug = decodeURIComponent(requestedSlug); } catch { /* use the raw value */ }
        const slug = toSlug({ slug: requestedSlug });
        if (!slug) return;
        const idx = effectiveItems.findIndex((r) => toSlug(r) === slug);
        if (idx >= 0) releaseSwitcher.goTo(idx);
    }, [effectiveItems, initialReleaseSlug, releaseSwitcher]);

    // Keep the selected music release as a canonical root-level permalink.
    useEffect(() => {
        if (activeKey !== 'music' || (hub && hubPhase !== 'section')) return;
        const slug = toSlug(effectiveItems[releaseSwitcher.current]);
        if (!slug) return;
        const next = `/${encodeURIComponent(slug)}${window.location.search}`;
        if (`${window.location.pathname}${window.location.search}` !== next || window.location.hash) {
            window.history.replaceState(null, '', next);
        }
    }, [activeKey, effectiveItems, hub, hubPhase, releaseSwitcher.current]);

    useEffect(() => {
        setMixIndex(0);
        setMixPlaying(false);
    }, [activeKey]);
    useEffect(() => { setMixPlaying(false); }, [mixIndex]);

    // Camera dolly toward TV when playing — reads rest z from current cfg.
    // Only refresh the captured rest z when cfg changes via setCfg (full object
    // reference change). useFrame mutation of stops[0].pos.z keeps the array
    // ref stable so this effect never fires from animation, only from user
    // edits in the debug panel or initial load.
    const dollyRestZRef = useRef(cfg.stops[0].pos.z);
    useEffect(() => {
        dollyRestZRef.current = cfg.stops[0].pos.z;
    }, [cfg]);

    useEffect(() => {
        document.body.classList.add('home-new-active');
        return () => document.body.classList.remove('home-new-active');
    }, []);

    const saveCfg = useCallback(async (nextCfg) => {
        const hydrated = hydrateCfg(nextCfg, stopCount);
        if (!hydrated) return;

        if (hub && cfgContext !== 'menu' && tunerConfigKey) {
            const sectionItems = siteSettings?.sceneItemConfigs?.[cfgContext] || {};
            await updateSiteSettings({
                ...siteSettings,
                sceneItemConfigs: {
                    ...(siteSettings?.sceneItemConfigs || {}),
                    [cfgContext]: { ...sectionItems, [tunerConfigKey]: hydrated },
                },
            });
            return;
        }

        if (activeServerCfgKey) {
            await updateSiteSettings({ ...siteSettings, [activeServerCfgKey]: hydrated });
            return;
        }

        localStorage.setItem(cfgStorageKey, JSON.stringify(hydrated));
    }, [
        activeServerCfgKey, cfgContext, cfgStorageKey, hub, siteSettings,
        stopCount, tunerConfigKey, updateSiteSettings,
    ]);

    const clearCfg = useCallback(async () => {
        if (hub && cfgContext !== 'menu' && tunerConfigKey) {
            const sectionItems = { ...(siteSettings?.sceneItemConfigs?.[cfgContext] || {}) };
            delete sectionItems[tunerConfigKey];
            await updateSiteSettings({
                ...siteSettings,
                sceneItemConfigs: {
                    ...(siteSettings?.sceneItemConfigs || {}),
                    [cfgContext]: sectionItems,
                },
            });
            return;
        }

        if (activeServerCfgKey) {
            await updateSiteSettings({ ...(siteSettings || {}), [activeServerCfgKey]: null });
            return;
        }

        localStorage.removeItem(cfgStorageKey);
        setCfg(initialCfg);
    }, [
        activeServerCfgKey, cfgContext, cfgStorageKey, hub, initialCfg,
        siteSettings, tunerConfigKey, updateSiteSettings,
    ]);

    if (!cfgReady) return <div className="home-new-page" aria-hidden="true" />;

    return (
        <div className="home-new-page">
            {(hub || effectiveItems.length > 0) && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={hub
                            ? { position: [0, (cfg.hub || DEFAULT_HUB).camY, -((cfg.hub || DEFAULT_HUB).ringRadius + hubCameraDistance(cfg.hub || DEFAULT_HUB))], fov: (cfg.hub || DEFAULT_HUB).fov }
                            : { position: [0, 3, 7], fov: cfg.stops[0].fov }}
                        gl={{ antialias: true, alpha: true }}
                        dpr={[1, 2]}
                    >
                        <Scene
                            releases={effectiveItems}
                            activeItemIndex={releaseSwitcher.current}
                            activeItemOnly={activeKey === 'music'}
                            hub={hubProps}
                            cfgRef={cfgRef}
                            progressRef={progressRef}
                            releaseOffsetRef={releaseSwitcher.offsetRef}
                            tiltRef={deviceTiltRef}
                            floorTextZ={cfg.floorTextZ}
                            photoZ={cfg.photoZ}
                            billboard={cfg.billboard}
                            stack={cfg.stack}
                            support={cfg.support}
                            codeCaption={cfg.codeCaption}
                            showCodeCaption={!!activeSection.showCodeCaption}
                            fullDescriptionOnly={!!activeSection.fullDescriptionOnly}
                            simple={activeSection.simple}
                            portfolio={activeSection.portfolio}
                            richText={activeSection.richText}
                            hideBillboard={!!activeSection.hideBillboard}
                            tvMix={currentMix}
                            tvPlaying={mixPlaying}
                            tv={cfg.tv}
                            tvComingSoon={!!activeSection.comingSoon}
                            dollyEnabled={!!effectiveMixes && !activeSection.comingSoon}
                            dollyRestZRef={dollyRestZRef}
                            dollyPlayZ={cfg.tv.playStop0Z ?? 5.6}
                        />
                    </Canvas>
                </div>
            )}

            <div
                className={`home-new-gradient${sectionControls && currentIndex > 0 ? ' is-floor-view' : ''}`}
                aria-hidden="true"
            />
            <Header
                theme={!hub || hubPhase === 'section' ? (currentIndex === 0 ? 'light' : 'dark') : 'light'}
                showSwipeUpHint={hub && hubPhase === 'section'}
            />
            {sectionControls && (
                <StopIndicator count={activeStopCount} currentIndex={currentIndex} goTo={goTo} startIndex={sectionEntryStop} />
            )}

            {sectionControls && activeKey === 'music' && currentIndex === 0 && effectiveItems.length > 1 && (
                <div className="hn-release-edge-nav" aria-label="Release navigation">
                    <button
                        type="button"
                        className="mp3d-nav hn-release-edge-button hn-release-edge-button-left"
                        onClick={releaseSwitcher.prev}
                        disabled={releaseSwitcher.current === 0}
                        aria-label="Previous release"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                            <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="mp3d-nav hn-release-edge-button hn-release-edge-button-right"
                        onClick={releaseSwitcher.next}
                        disabled={releaseSwitcher.current >= effectiveItems.length - 1}
                        aria-label="Next release"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                            <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                    </button>
                </div>
            )}

            {hub && hubPhase === 'menu' && (
                <>
                    <div className="mp3d-counter" aria-hidden="true">
                        {String(hubDisplayIndex(ringIndex) + 1).padStart(2, '0')} / {String(HUB_ITEMS.length).padStart(2, '0')}
                    </div>
                    <div className="mp3d-swipe-arrow" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="22" height="22">
                            <path d="M6 9 L12 15 L18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                    </div>
                    <div className="mp3d-ui">
                        <button className="mp3d-nav" onClick={() => hubRotateByButton(1)} aria-label={window.matchMedia('(min-width: 769px)').matches ? 'Previous section' : 'Next section'}>
                            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                        <button className="mp3d-pill" onClick={hubEnter}>{`OPEN ${HUB_ITEMS[ringIndex].label}`}</button>
                        <button className="mp3d-nav" onClick={() => hubRotateByButton(-1)} aria-label={window.matchMedia('(min-width: 769px)').matches ? 'Next section' : 'Previous section'}>
                            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                    </div>
                    <div className="mp3d-hint" aria-hidden="true">scroll down to enter · swipe to switch</div>
                </>
            )}
            {sectionControls && effectiveMixes && effectiveMixes.length > 0 && !activeSection.comingSoon ? (
                <MixSwitcher
                    mixes={effectiveMixes}
                    currentIndex={mixIndex}
                    onIndex={setMixIndex}
                    playing={mixPlaying}
                    onTogglePlay={() => setMixPlaying((p) => !p)}
                />
            ) : sectionControls && activeSection.bottomAction ? (
                <BottomAction
                    label={activeSection.bottomAction.label}
                    href={activeSection.bottomAction.href}
                    onPrev={releaseSwitcher.prev}
                    onNext={releaseSwitcher.next}
                    canPrev={releaseSwitcher.current > 0}
                    canNext={releaseSwitcher.current < effectiveItems.length - 1}
                    light={activeKey === 'code'}
                />
            ) : (!simple && currentRelease && sectionControls && (
                <AlbumPlayer
                    release={currentRelease}
                    releases={effectiveItems}
                    currentReleaseIndex={releaseSwitcher.current}
                    onReleaseSelect={releaseSwitcher.goTo}
                    compact={currentIndex > 0}
                />
            ))}

            {(showDebug || siteSettings?.cameraTunerEnabled) && createPortal(
                <DebugPanel
                    cfg={cfg}
                    setCfg={setCfg}
                    currentIndex={currentIndex}
                    goTo={goTo}
                    progressRef={progressRef}
                    onSaveToServer={saveCfg}
                    onResetServer={clearCfg}
                    hubMode={hub}
                    hubPhase={hubPhase}
                    sectionKey={activeKey}
                    sectionEntryStop={sectionEntryStop}
                    simple={activeSection.simple}
                    hasTv={!!effectiveMixes}
                    hideBillboard={!!activeSection.hideBillboard}
                    showCodeCaption={!!activeSection.showCodeCaption}
                    tunerItems={effectiveItems}
                    tunerItemIndex={tunerItemIndex}
                    tunerScope={tunerScope}
                    visibleStopCount={activeStopCount}
                    onTunerItem={(value) => {
                        if (value === 'section') {
                            setTunerScope('section');
                            return;
                        }
                        const index = Number(value.split(':')[1]);
                        setTunerScope('item');
                        if (effectiveMixes) setMixIndex(index);
                        else releaseSwitcher.goTo(index);
                        goTo(sectionEntryStop, true, sectionEntryStop);
                    }}
                />,
                document.body,
            )}
        </div>
    );
};

// '/' — the hub: one unified 3D world (linear menu at the center, the music
// section beyond it).
const debugQueryEnabled = () => /[?&](?:debug|cam)=1\b/.test(window.location.search);

const HomeNewPage = () => (
    <Scene3DShell serverCfgKey="homeNewConfig" showDebug={debugQueryEnabled()} hub />
);

const HubSectionPage = ({ initialKey, initialReleaseSlug = null }) => {
    const showDebug = debugQueryEnabled();
    return <Scene3DShell serverCfgKey="homeNewConfig" showDebug={showDebug} hub initialKey={initialKey} initialReleaseSlug={initialReleaseSlug} />;
};

export const MusicNewPage = ({ releaseSlug = null }) => <HubSectionPage initialKey="music" initialReleaseSlug={releaseSlug} />;
export const MixesHubPage = () => <HubSectionPage initialKey="mixes" />;
export const CodeHubPage = () => <HubSectionPage initialKey="code" />;
export const AboutHubPage = () => <HubSectionPage initialKey="about" />;

export default HomeNewPage;
