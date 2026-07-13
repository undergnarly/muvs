import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text, useTexture } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import AlbumPlayer from '../media/AlbumPlayer';
import { useData } from '../../context/DataContext';
import {
    RingMenu, HUB_ITEMS, HUB_SPACING, HUB_RETURN_KEY, DEFAULT_HUB,
    hubMod, hubDisplayIndex, hubSmoothstep, hubMenuPose, lerpPose,
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
const HUB_IN_CANVAS = new Set(['music', 'mixes', 'code']);
const HUB_DEFAULT_YOUTUBE = 'https://www.youtube.com/watch?v=gcqrg86VVeQ';
const hubDynamicEase = (t) => hubSmoothstep(hubSmoothstep(t));

const toSlug = (r) => (r?.slug || r?.title || '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
        hub: { ...DEFAULT_HUB, ...(cfg.hub || {}) },
    };
};

// ================ snap scroll (vertical) ================

const useSnapScroll = (numStops, { enabled = true, onOverscrollUp, initialIndex = 0 } = {}) => {
    const initial = Math.max(0, Math.min(numStops - 1, initialIndex));
    const indexRef = useRef(initial);
    const progressRef = useRef(numStops <= 1 ? 0 : initial / (numStops - 1));
    const [currentIndex, setCurrentIndex] = useState(initial);
    const overscrollUpRef = useRef(onOverscrollUp);
    useEffect(() => { overscrollUpRef.current = onOverscrollUp; }, [onOverscrollUp]);

    const goTo = useCallback(
        (idx) => {
            const i = Math.max(0, Math.min(numStops - 1, idx));
            indexRef.current = i;
            setCurrentIndex(i);
        },
        [numStops],
    );

    useEffect(() => {
        if (!enabled) return undefined;
        let lastWheel = 0;
        const step = (dir) => {
            if (dir === -1 && indexRef.current === 0) {
                overscrollUpRef.current?.();
                return;
            }
            const next = Math.max(0, Math.min(numStops - 1, indexRef.current + dir));
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

const Billboard = ({ release, x, billboard, hideCover = false }) => {
    const tex = useTexture(release.coverImage || FALLBACK_COVER);
    useEffect(() => {
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
        }
    }, [tex]);

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
            <Text
                position={[0, billboard.titleY, billboard.titleZ]}
                fontSize={billboard.titleSize}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                maxWidth={9}
                textAlign="center"
                letterSpacing={-0.02}
                font={releaseFontUrl(billboard.titleFont, FONT_BOLD)}
            >
                {(release.title || 'UNTITLED').toUpperCase()}
            </Text>

            <Text
                position={[0, billboard.artistY, billboard.artistZ]}
                fontSize={billboard.artistSize}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.15}
                font={releaseFontUrl(billboard.artistFont, FONT_REGULAR)}
            >
                {(release.artists || '').toUpperCase()}
            </Text>

            {!hideCover && (
                <mesh position={[0, billboard.coverY, 0]}>
                    <planeGeometry args={[width, height]} />
                    <meshBasicMaterial map={tex} transparent toneMapped={false} />
                </mesh>
            )}
        </group>
    );
};

const FloorText = ({ release, x, z, richText = false }) => {
    const meta = release.releaseDate ? `RELEASED · ${release.releaseDate}` : '';
    const html = richText ? (release.fullDescription || release.description || '') : '';
    const plain = richText ? '' : stripHtml(release.description);

    return (
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

            {richText ? (
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
            ) : (
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
            )}
        </group>
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
            image: item?.image || '',
            caption: item?.text || item?.caption || '',
            seed: seed + i,
        };
    });
};

const tmpVec = new THREE.Vector3();

const PolaroidPhoto = ({ image }) => {
    const tex = useTexture(image);
    useEffect(() => { if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; } }, [tex]);
    return (
        <mesh position={[0, POLAROID_PHOTO_OFFSET_Y, 0.008]}>
            <planeGeometry args={[POLAROID_PHOTO_W, POLAROID_PHOTO_H]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
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

const FloorPhotoSheet = ({ sheet, index }) => {
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
                <Suspense fallback={
                    <mesh position={[0, POLAROID_PHOTO_OFFSET_Y, 0.008]}>
                        <planeGeometry args={[POLAROID_PHOTO_W, POLAROID_PHOTO_H]} />
                        <meshStandardMaterial color="#d8dcde" roughness={0.86} metalness={0} />
                    </mesh>
                }>
                    <PolaroidPhoto image={sheet.image} />
                </Suspense>
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

const FloorPhotoSheets = ({ x, z, seed, gallery }) => {
    const sheets = useMemo(() => generateFloorSheets(gallery, seed), [gallery, seed]);
    return (
        <group position={[x, 0.018, z]} rotation={[-Math.PI / 2, 0, 0]}>
            {sheets.map((sheet, index) => (
                <FloorPhotoSheet key={index} sheet={sheet} index={index} />
            ))}
        </group>
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
    const ref = useRef(null);
    const { camera } = useThree();
    const half = size / 2;
    const tex = useMemo(() => buildLogoTexture(platformKey, color), [platformKey, color]);
    const rotX = useMemo(() => (Math.random() - 0.5) * (Math.PI / 9), []);

    const onClick = (e) => {
        e.stopPropagation();
        if (!ref.current) return;
        const hit = e.point.clone();
        const dir = hit.clone().sub(camera.position).normalize();
        ref.current.applyImpulse({ x: dir.x * 7, y: 3, z: dir.z * 7 }, true);
        ref.current.applyTorqueImpulse({ x: (Math.random() - 0.5) * 1.5, y: (Math.random() - 0.5) * 1.5, z: (Math.random() - 0.5) * 1.5 }, true);
        if (url) {
            setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 360);
        }
    };

    return (
        <RigidBody
            ref={ref}
            position={pos}
            rotation={[rotX, 0, 0]}
            restitution={0.18}
            friction={0.7}
            mass={1}
            linearDamping={0.4}
            angularDamping={0.4}
            colliders={false}
        >
            <CuboidCollider args={[half, half, half]} />
            <mesh onClick={onClick}>
                <boxGeometry args={[size, size, size]} />
                <meshStandardMaterial map={tex} roughness={0.45} metalness={0.05} />
            </mesh>
        </RigidBody>
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

const SupportFloorText = ({ x, support }) => (
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
);

const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

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

const ScrollCamera = ({ cfgRef, progressRef, releaseOffsetRef }) => {
    const lookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }) => {
        const c = cfgRef.current;
        const { pos, look, fov } = sampleStops(c.stops, progressRef.current);
        const offX = releaseOffsetRef.current;

        camera.position.set(pos.x + offX, pos.y, pos.z);
        lookAt.current.set(look.x + offX, look.y, look.z);
        camera.lookAt(lookAt.current);

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
const HubCamera = ({ cfgRef, stRef, progressRef, releaseOffsetRef, onPhase, onForeignLeft, ringRef, sectionRef }) => {
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
            const lp = sampleStops(cfg.stops, 0);
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
    const tex = useTexture(image);
    useEffect(() => { if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; } }, [tex]);
    return (
        <mesh>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
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

const PortfolioItems = ({ items }) => (
    <>
        {items.map((it, i) => (
            <PortfolioItem
                key={it.id ?? i}
                pos={[it.x ?? DEFAULT_PORTFOLIO_LAYOUT[i]?.x ?? 0, 0, it.z ?? DEFAULT_PORTFOLIO_LAYOUT[i]?.z ?? 0]}
                image={it.image}
                url={it.url}
                label={it.label}
                description={it.description}
            />
        ))}
    </>
);

const Scene = ({ releases, cfgRef, progressRef, releaseOffsetRef, floorTextZ, photoZ, billboard, stack, support, simple, portfolio, richText, tvMix, tvPlaying, tv, tvComingSoon, dollyRestZRef, dollyPlayZ, dollyEnabled, hub = null }) => {
    const sectionContent = (
        <>
            {!simple && (
                <Physics gravity={[0, -9.81, 0]}>
                    <RigidBody type="fixed" colliders={false}>
                        <CuboidCollider args={[80, 0.5, 40]} position={[0, -0.5, 0]} />
                    </RigidBody>
                    {releases.map((r, i) => (
                        <PlatformStack key={`stack-${r.id ?? i}`} release={r} x={i * RELEASE_SPACING} stackCfg={stack} />
                    ))}
                </Physics>
            )}
            {releases.map((r, i) => (
                <React.Fragment key={r.id ?? i}>
                    <Suspense fallback={null}>
                        <Billboard release={r} x={i * RELEASE_SPACING} billboard={billboard} hideCover={!!tvMix} />
                    </Suspense>
                    <FloorPhotoSheets x={i * RELEASE_SPACING} z={photoZ} seed={i * 7} gallery={r.gallery} />
                    <FloorText release={r} x={i * RELEASE_SPACING} z={floorTextZ} richText={richText} />
                    {!simple && <SupportFloorText x={i * RELEASE_SPACING} support={support} />}
                </React.Fragment>
            ))}
            {portfolio && portfolio.length > 0 && <PortfolioItems items={portfolio} />}
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
                />
            ) : (
                <ScrollCamera cfgRef={cfgRef} progressRef={progressRef} releaseOffsetRef={releaseOffsetRef} />
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
                        onSelect={hub.onSelect}
                        activeIndex={hub.activeIndex}
                        activeOnly={hub.phase !== 'menu'}
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

const BottomAction = ({ label, href, onPrev, onNext, canPrev, canNext }) => {
    const onClick = () => {
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
    };
    return (
        <div className="hn-player">
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

const DebugPanel = ({ cfg, setCfg, currentIndex, goTo, progressRef, onSaveToServer, onResetServer, hubMode = false }) => {
    const [open, setOpen] = useState(true);
    const [editIdx, setEditIdx] = useState(currentIndex);
    const [progress, setProgress] = useState(0);

    useEffect(() => { setEditIdx(currentIndex); }, [currentIndex]);

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
        setCfg(DEFAULT_CFG);
    };

    if (!open) return <button className="dbg-toggle" onClick={() => setOpen(true)}>cam</button>;

    return (
        <div className="dbg-panel">
            <div className="dbg-head">
                <span>camera tuner</span>
                <span className="dbg-progress">{(progress * 100).toFixed(0)}%</span>
                <button onClick={saveCfg} className={`dbg-btn dbg-btn-primary ${savedFlash ? 'flash' : ''}`}>{savedFlash ? 'saved!' : 'save'}</button>
                <button onClick={clearSaved} className="dbg-btn">reset</button>
                <button onClick={exportCfg} className="dbg-btn">copy</button>
                <button onClick={() => setOpen(false)} className="dbg-btn">×</button>
            </div>

            <div className="dbg-stops">
                {cfg.stops.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { goTo(i); setEditIdx(i); }}
                        className={`dbg-stop ${currentIndex === i ? 'active' : ''} ${editIdx === i ? 'editing' : ''}`}
                    >
                        {Math.round((i / (cfg.stops.length - 1)) * 100)}%
                    </button>
                ))}
            </div>

            <div className="dbg-edit-hint">editing stop {editIdx} ({Math.round((editIdx / (cfg.stops.length - 1)) * 100)}%)</div>

            {hubMode && (
                <div className="dbg-block">
                    <div className="dbg-title">hub menu (ring)</div>
                    <Row label="ring r"   value={cfg.hub?.ringRadius ?? 9}  min={4}   max={24}  step={0.1}  onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, ringRadius: v } })} />
                    <Row label="cam dist" value={cfg.hub?.camDist ?? 11}    min={3}   max={30}  step={0.1}  onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, camDist: v } })} />
                    <Row label="cam y"    value={cfg.hub?.camY ?? 2.6}      min={0.2} max={10}  step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, camY: v } })} />
                    <Row label="look y"   value={cfg.hub?.lookY ?? 2.5}     min={0}   max={8}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, lookY: v } })} />
                    <Row label="fov"      value={cfg.hub?.fov ?? 50}        min={25}  max={100} step={1}    onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, fov: v } })} />
                    <Row label="sect dist" value={cfg.hub?.sectionDist ?? 56} min={24} max={140} step={1}   onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, sectionDist: v } })} />
                    <Row label="item sz"  value={cfg.hub?.itemSize ?? 3.4}  min={1}   max={7}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, itemSize: v } })} />
                    <Row label="item y"   value={cfg.hub?.itemY ?? 2.45}    min={0}   max={6}   step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, itemY: v } })} />
                    <Row label="caption gap" value={cfg.hub?.captionOffset ?? 1.2} min={-8} max={8} step={0.05} onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, captionOffset: v } })} />
                    <Row label="travel s" value={cfg.hub?.travelDur ?? 1.8} min={0.5} max={5}   step={0.1}  onChange={(v) => setCfg({ ...cfg, hub: { ...cfg.hub, travelDur: v } })} />
                </div>
            )}

            <Vec3Block title="position" vec={stop.pos} setVec={(v) => updateStop(editIdx, { pos: v })} />
            <Vec3Block title="look at"  vec={stop.look} setVec={(v) => updateStop(editIdx, { look: v })} />

            <div className="dbg-block">
                <div className="dbg-title">fov · stop {editIdx}</div>
                <Row label="fov" value={stop.fov} min={10} max={120} step={1} onChange={(v) => updateStop(editIdx, { fov: v })} />
            </div>

            <div className="dbg-block">
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
            </div>

            <div className="dbg-block">
                <div className="dbg-title">stack (links)</div>
                <Row label="x"      value={cfg.stack.pos.x}  min={-15} max={15} step={0.1} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, x: v } } })} />
                <Row label="y"      value={cfg.stack.pos.y}  min={-3}  max={10} step={0.05} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, y: v } } })} />
                <Row label="z"      value={cfg.stack.pos.z}  min={-5}  max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, pos: { ...cfg.stack.pos, z: v } } })} />
                <Row label="size"   value={cfg.stack.boxSize} min={0.2} max={2} step={0.02} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, boxSize: v } })} />
                <Row label="gap"    value={cfg.stack.gap}     min={0}   max={0.5} step={0.01} onChange={(v) => setCfg({ ...cfg, stack: { ...cfg.stack, gap: v } })} />
            </div>

            <div className="dbg-block">
                <div className="dbg-title">support text</div>
                <Row label="x"        value={cfg.support.pos.x}    min={-15} max={15} step={0.1} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, x: v } } })} />
                <Row label="y"        value={cfg.support.pos.y}    min={-1}  max={3}  step={0.01} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, y: v } } })} />
                <Row label="z"        value={cfg.support.pos.z}    min={-5}  max={30} step={0.1} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, pos: { ...cfg.support.pos, z: v } } })} />
                <Row label="meta sz"  value={cfg.support.metaSize} min={0.1} max={1}  step={0.02} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, metaSize: v } })} />
                <Row label="text sz"  value={cfg.support.fontSize} min={0.1} max={2}  step={0.02} onChange={(v) => setCfg({ ...cfg, support: { ...cfg.support, fontSize: v } })} />
            </div>

            <div className="dbg-block">
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
            </div>

            <div className="dbg-block">
                <div className="dbg-title">scene</div>
                <Row label="floor txt z" value={cfg.floorTextZ} min={-15} max={20} onChange={(v) => setCfg({ ...cfg, floorTextZ: v })} />
                <Row label="photo z"     value={cfg.photoZ}     min={-15} max={20} onChange={(v) => setCfg({ ...cfg, photoZ: v })} />
                <Row label="fog near"    value={cfg.fogNear}    min={0}   max={50} step={0.5} onChange={(v) => setCfg({ ...cfg, fogNear: v })} />
                <Row label="fog far"     value={cfg.fogFar}     min={5}   max={120} step={1} onChange={(v) => setCfg({ ...cfg, fogFar: v })} />
            </div>
        </div>
    );
};

const StopIndicator = ({ count, currentIndex, goTo }) => (
    <div className="hn-dots" aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
            <button
                key={i}
                className={`hn-dot ${currentIndex === i ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to stop ${i + 1}`}
            />
        ))}
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
}) => {
    const { releases, mixes, projects, siteSettings, updateSiteSettings } = useData();
    const navigate = useNavigate();

    const displayItems = React.useMemo(() => {
        const source = itemsProp ?? releases;
        const sorted = [...(source || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        return sorted;
    }, [itemsProp, releases]);

    const initialCfg = useMemo(() => ({ ...DEFAULT_CFG, stops: buildDefaultStops(stopCount) }), [stopCount]);

    const loadLocal = useCallback(() => {
        try {
            const raw = localStorage.getItem(cfgStorageKey);
            if (!raw) return null;
            return hydrateCfg(JSON.parse(raw), stopCount);
        } catch { return null; }
    }, [cfgStorageKey, stopCount]);

    const serverCfg = serverCfgKey ? siteSettings?.[serverCfgKey] : null;

    const [cfg, setCfg] = useState(() => loadLocal() || hydrateCfg(serverCfg, stopCount) || initialCfg);
    const cfgRef = useRef(cfg);
    useEffect(() => { cfgRef.current = cfg; }, [cfg]);
    const localCfgSyncedRef = useRef(false);

    const saveCfgToServer = useCallback((nextCfg) => {
        if (!serverCfgKey) return;
        const hydrated = hydrateCfg(nextCfg, stopCount);
        if (!hydrated) return;
        updateSiteSettings({ ...siteSettings, [serverCfgKey]: hydrated });
    }, [serverCfgKey, siteSettings, updateSiteSettings, stopCount]);

    const resetServerCfg = useCallback(() => {
        if (!serverCfgKey) return;
        const nextSettings = { ...(siteSettings || {}) };
        delete nextSettings[serverCfgKey];
        updateSiteSettings(nextSettings);
    }, [serverCfgKey, siteSettings, updateSiteSettings]);

    useEffect(() => {
        const localCfg = loadLocal();
        if (localCfg && !localCfgSyncedRef.current) {
            localCfgSyncedRef.current = true;
            setCfg(localCfg);
            if (serverCfgKey && JSON.stringify(serverCfg) !== JSON.stringify(localCfg)) {
                saveCfgToServer(localCfg);
            }
            return;
        }
        if (!localCfg) {
            const hydrated = hydrateCfg(serverCfg, stopCount);
            // equality guard: sibling siteSettings writes (e.g. visit stats)
            // change serverCfg identity without changing content
            if (hydrated && JSON.stringify(hydrated) !== JSON.stringify(cfgRef.current)) setCfg(hydrated);
        }
    }, [serverCfg, saveCfgToServer, loadLocal, serverCfgKey, stopCount]);

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
    const sectionControls = !hub || hubPhase === 'section';

    const musicSection = useMemo(() => ({
        items: displayItems,
        simple,
        tvMixes,
        portfolio,
        richText,
        bottomAction,
    }), [displayItems, simple, tvMixes, portfolio, richText, bottomAction]);

    const mixesItems = useMemo(() => {
        const source = (mixes || []).length ? mixes : [{
            id: 'mixes-empty',
            title: 'MIXES',
            description: 'Add mixes in the admin panel.',
            youtubeUrl: HUB_DEFAULT_YOUTUBE,
        }];
        return [...source]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((mix) => ({
                ...mix,
                artists: mix.artists || 'MUVS',
                releaseDate: mix.releaseDate || mix.recordDate || mix.date || '',
                coverImage: mix.coverImage || mix.backgroundImage || '',
                youtubeUrl: mix.youtubeUrl || HUB_DEFAULT_YOUTUBE,
            }));
    }, [mixes]);

    const codeItems = useMemo(() => {
        const source = (projects || []).length ? projects : [{
            id: 'code-empty',
            title: 'CODE',
            type: 'PROJECTS',
            description: 'Add websites, AI work and projects in the admin panel.',
        }];
        return [...source]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((project) => ({
                ...project,
                artists: project.artists || project.type || 'PROJECT',
                releaseDate: project.releaseDate || project.date || '',
                coverImage: project.coverImage || project.thumbnail || '',
                description: project.fullDescription || project.description || '',
            }));
    }, [projects]);

    const requestUrl = siteSettings?.socialLinks?.telegram || 'https://t.me/muvs';
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
            bottomAction: { label: 'MAKE REQUEST', href: requestUrl },
        },
    }), [musicSection, mixesItems, codeItems, requestUrl]);
    const activeSection = hub ? (hubSections[activeKey] || musicSection) : musicSection;
    const effectiveItems = activeSection.items;

    const startTravelBack = useCallback(() => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'section') return;
        st.phase = 'travel';
        st.dir = -1;
        setHubPhase('travel');
    }, []);

    const { progressRef, currentIndex, goTo } = useSnapScroll(cfg.stops.length, {
        enabled: sectionControls,
        onOverscrollUp: hub ? startTravelBack : undefined,
        initialIndex: initialStop,
    });
    const releaseSwitcher = useReleaseSwitcher(
        effectiveItems.length,
        useCallback(() => goTo(0), [goTo]),
        { enabled: sectionControls },
    );
    const currentRelease = effectiveItems[Math.min(releaseSwitcher.current, effectiveItems.length - 1)];

    useEffect(() => {
        releaseSwitcher.goTo(0);
        goTo(hub ? 0 : initialStop);
    }, [activeKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const startTravelIn = useCallback(() => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        goTo(0);
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
            setActiveKey(item.key);
            startTravelIn();
        } else {
            startForeign(item);
        }
    }, [startTravelIn, startForeign]);

    const hubRotateBy = useCallback((d) => {
        const st = hubStateRef.current;
        if (!st || st.phase !== 'menu') return;
        st.menuIndex += d;
        setRingIndex(hubMod(st.menuIndex));
    }, []);

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
            music: '/images/menu/music2.png',
            mixes: null,
            code: '/images/menu/code2.png',
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

    const hubProps = hub ? {
        cfg: cfg.hub || DEFAULT_HUB,
        covers: hubCovers,
        phase: hubPhase,
        activeIndex: ringIndex,
        stateRef: hubStateRef,
        onSelect: hubSelect,
        onPhase: hubOnPhase,
        onForeignLeft: hubForeignLeft,
    } : null;

    // Deep link: read hash on first data load, navigate to matching release
    const hashNavigatedRef = useRef(false);
    useEffect(() => {
        if (hashNavigatedRef.current || !effectiveItems.length) return;
        hashNavigatedRef.current = true;
        const hash = window.location.hash.replace('#', '');
        if (!hash) return;
        const idx = effectiveItems.findIndex((r) => toSlug(r) === hash);
        if (idx >= 0) releaseSwitcher.goTo(idx);
    }, [effectiveItems, releaseSwitcher]);

    // Deep link: update hash when current release changes
    useEffect(() => {
        const slug = toSlug(effectiveItems[releaseSwitcher.current]);
        if (!slug) return;
        const next = '#' + slug;
        if (window.location.hash !== next) window.history.replaceState(null, '', next);
    }, [releaseSwitcher.current, effectiveItems]);

    const [mixIndex, setMixIndex] = useState(0);
    const [mixPlaying, setMixPlaying] = useState(false);
    const effectiveMixes = activeSection.tvMixes;
    const currentMix = effectiveMixes?.[mixIndex] || null;
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
        try {
            localStorage.setItem(cfgStorageKey, JSON.stringify(nextCfg));
            await saveCfgToServer(nextCfg);
        } catch (e) { console.error('save failed', e); }
    }, [cfgStorageKey, saveCfgToServer]);

    const clearCfg = useCallback(async () => {
        try { localStorage.removeItem(cfgStorageKey); } catch { /* ignore */ }
        await resetServerCfg();
    }, [cfgStorageKey, resetServerCfg]);

    return (
        <div className="home-new-page">
            {(hub || effectiveItems.length > 0) && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={hub
                            ? { position: [0, (cfg.hub || DEFAULT_HUB).camY, -((cfg.hub || DEFAULT_HUB).ringRadius + (cfg.hub || DEFAULT_HUB).camDist)], fov: (cfg.hub || DEFAULT_HUB).fov }
                            : { position: [0, 3, 7], fov: cfg.stops[0].fov }}
                        gl={{ antialias: true, alpha: true }}
                        dpr={[1, 2]}
                    >
                        <Scene
                            releases={effectiveItems}
                            hub={hubProps}
                            cfgRef={cfgRef}
                            progressRef={progressRef}
                            releaseOffsetRef={releaseSwitcher.offsetRef}
                            floorTextZ={cfg.floorTextZ}
                            photoZ={cfg.photoZ}
                            billboard={cfg.billboard}
                            stack={cfg.stack}
                            support={cfg.support}
                            simple={activeSection.simple}
                            portfolio={activeSection.portfolio}
                            richText={activeSection.richText}
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
            <Header theme={!hub || hubPhase === 'section' ? (currentIndex === 0 ? 'light' : 'dark') : 'light'} />
            {sectionControls && (
                <StopIndicator count={cfg.stops.length} currentIndex={currentIndex} goTo={goTo} />
            )}

            {hub && hubPhase === 'menu' && (
                <>
                    <div className="mp3d-counter" aria-hidden="true">
                        {String(hubDisplayIndex(ringIndex) + 1).padStart(2, '0')} / {String(HUB_ITEMS.length).padStart(2, '0')}
                    </div>
                    <div className="mp3d-ui">
                        <button className="mp3d-nav" onClick={() => hubRotateBy(1)} aria-label="Next section">
                            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                        <button className="mp3d-pill" onClick={hubEnter}>{`OPEN ${HUB_ITEMS[ringIndex].label}`}</button>
                        <button className="mp3d-nav" onClick={() => hubRotateBy(-1)} aria-label="Previous section">
                            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                                <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            </svg>
                        </button>
                    </div>
                    <div className="mp3d-hint" aria-hidden="true">scroll down to enter · swipe to switch</div>
                </>
            )}
            {hub && hubPhase === 'section' && (
                <button className="mp3d-back" onClick={startTravelBack}>↑ menu</button>
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
                />
            ) : (!simple && currentRelease && sectionControls && (
                <AlbumPlayer
                    release={currentRelease}
                    releases={effectiveItems}
                    currentReleaseIndex={releaseSwitcher.current}
                    onReleaseSelect={releaseSwitcher.goTo}
                />
            ))}

            {showDebug && createPortal(
                <DebugPanel
                    cfg={cfg}
                    setCfg={setCfg}
                    currentIndex={currentIndex}
                    goTo={goTo}
                    progressRef={progressRef}
                    onSaveToServer={saveCfg}
                    onResetServer={clearCfg}
                    hubMode={hub}
                />,
                document.body,
            )}
        </div>
    );
};

// '/' — the hub: one unified 3D world (linear menu at the center, the music
// section beyond it).
const HomeNewPage = () => (
    <Scene3DShell serverCfgKey="homeNewConfig" showDebug hub />
);

const HubSectionPage = ({ initialKey }) => {
    const showDebug = /[?&](?:debug|cam)=1\b/.test(window.location.search);
    return <Scene3DShell serverCfgKey="homeNewConfig" showDebug={showDebug} hub initialKey={initialKey} />;
};

export const MusicNewPage = () => <HubSectionPage initialKey="music" />;
export const MixesHubPage = () => <HubSectionPage initialKey="mixes" />;
export const CodeHubPage = () => <HubSectionPage initialKey="code" />;

export default HomeNewPage;
