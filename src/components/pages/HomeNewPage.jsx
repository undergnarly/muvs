import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text, useTexture } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import Header from '../layout/Header';
import { useData } from '../../context/DataContext';
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

const DEFAULT_STOPS = [
    { pos: { x: 0,    y: 3.0,  z: 7.0  }, look: { x: 0,    y:  2.6, z: 0.0  }, fov: 46  },
    { pos: { x: 0,    y: 5.2,  z: 10.3 }, look: { x: 0,    y: -0.2, z: 9.7  }, fov: 113 },
    { pos: { x: -7.6, y: 8.8,  z: 30.0 }, look: { x: -0.7, y:  1.6, z: 17.0 }, fov: 21  },
    { pos: { x: 2.7,  y: 15.4, z: 30.0 }, look: { x: -5.3, y:  0.1, z: 11.4 }, fov: 27  },
];

const DEFAULT_BILLBOARD = {
    coverSize: 3,
    coverY: 0.25,
    titleY: 1.15,
    titleZ: -3,
    titleSize: 0.72,
    artistY: 1.6,
    artistZ: -3,
    artistSize: 0.26,
};

const DEFAULT_STACK = {
    pos: { x: 0.4, y: -0.05, z: 14.8 },
    boxSize: 0.7,
    gap: 0.04,
};

const DEFAULT_SUPPORT = {
    pos: { x: -0.9, y: 0.98, z: 17.4 },
    fontSize: 0.42,
    metaSize: 0.22,
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
    };
};

// ================ snap scroll (vertical) ================

const useSnapScroll = (numStops) => {
    const indexRef = useRef(0);
    const progressRef = useRef(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const goTo = useCallback(
        (idx) => {
            const i = Math.max(0, Math.min(numStops - 1, idx));
            indexRef.current = i;
            setCurrentIndex(i);
        },
        [numStops],
    );

    useEffect(() => {
        let lastWheel = 0;
        const onWheel = (e) => {
            // Only handle vertical-dominant scroll; horizontal goes to release switcher.
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            e.preventDefault();
            const now = Date.now();
            if (now - lastWheel < 650) return;
            if (Math.abs(e.deltaY) < 4) return;
            lastWheel = now;
            const dir = e.deltaY > 0 ? 1 : -1;
            const next = Math.max(0, Math.min(numStops - 1, indexRef.current + dir));
            if (next !== indexRef.current) {
                indexRef.current = next;
                setCurrentIndex(next);
            }
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
                const dir = dy > 0 ? 1 : -1;
                const next = Math.max(0, Math.min(numStops - 1, indexRef.current + dir));
                if (next !== indexRef.current) {
                    indexRef.current = next;
                    setCurrentIndex(next);
                }
            }
            touchY = null; touchX = null;
        };
        const onKey = (e) => {
            if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault();
                const next = Math.min(numStops - 1, indexRef.current + 1);
                indexRef.current = next; setCurrentIndex(next);
            } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
                e.preventDefault();
                const next = Math.max(0, indexRef.current - 1);
                indexRef.current = next; setCurrentIndex(next);
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
    }, [numStops]);

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

const useReleaseSwitcher = (count, onSwitch) => {
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
    }, [count]);

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

const Billboard = ({ release, x, billboard }) => {
    const tex = useTexture(release.coverImage);
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
                font={FONT_BOLD}
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
                font={FONT_REGULAR}
            >
                {(release.artists || '').toUpperCase()}
            </Text>

            <mesh position={[0, billboard.coverY, 0]}>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial map={tex} transparent toneMapped={false} />
            </mesh>
        </group>
    );
};

const FloorText = ({ release, x, z }) => {
    const description = stripHtml(release.description);
    const meta = release.releaseDate ? `RELEASED · ${release.releaseDate}` : '';

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
                {description}
            </Text>
        </group>
    );
};

const FLOOR_PHOTO_PRESETS = [
    { color: '#f7f4ec', image: '#d9dfe3' },
    { color: '#fbfaf6', image: '#e2d7cb' },
    { color: '#f3f0e8', image: '#cfd8d2' },
    { color: '#f1ede2', image: '#d6dbe1' },
    { color: '#fbf8f0', image: '#cdd6d2' },
];

const FLOOR_PHOTO_BASE = [
    { x: -2.6, y: -0.35, r: -0.22 },
    { x:  0.3, y:  0.55, r:  0.14 },
    { x: -1.1, y:  0.9,  r:  0.25 },
];

const generateFloorSheets = (seed) => {
    // Re-randomize on each mount so the photo scatter feels different per visit.
    const rand = () => Math.random();
    return FLOOR_PHOTO_BASE.map((base, i) => ({
        x: base.x + (rand() - 0.5) * 1.6,
        y: base.y + (rand() - 0.5) * 0.7,
        r: base.r + (rand() - 0.5) * 0.5,
        ...FLOOR_PHOTO_PRESETS[(i + Math.floor(rand() * FLOOR_PHOTO_PRESETS.length)) % FLOOR_PHOTO_PRESETS.length],
        seed: seed + i,
    }));
};

const tmpVec = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

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
            // target world position: ~2.5 units in front of camera, slightly down
            tmpVec.set(0, -0.25, -2.6).applyQuaternion(camera.quaternion);
            const wp = camera.getWorldPosition(new THREE.Vector3()).add(tmpVec);
            parent.updateMatrixWorld();
            const local = parent.worldToLocal(wp.clone());
            obj.position.lerp(local, 0.14);
            // target rotation: face camera (plane normal toward camera)
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
            <mesh position={[0, 0, 0.004]}>
                <planeGeometry args={[2.35, 1.45]} />
                <meshStandardMaterial color={sheet.color} roughness={0.92} metalness={0} />
            </mesh>
            <mesh position={[0, 0.08, 0.008]}>
                <planeGeometry args={[2.02, 1.14]} />
                <meshStandardMaterial color={sheet.image} roughness={0.86} metalness={0} />
            </mesh>
            <mesh position={[-0.55, -0.62, 0.01]}>
                <planeGeometry args={[0.74, 0.045]} />
                <meshStandardMaterial color="#d6d1c8" roughness={0.9} metalness={0} />
            </mesh>
            <mesh position={[0.34, -0.62, 0.01]}>
                <planeGeometry args={[0.48, 0.045]} />
                <meshStandardMaterial color="#ded9d0" roughness={0.9} metalness={0} />
            </mesh>
        </group>
    );
};

const FloorPhotoSheets = ({ x, z, seed }) => {
    const sheets = useMemo(() => generateFloorSheets(seed), [seed]);
    return (
        <group position={[x, 0.018, z]} rotation={[-Math.PI / 2, 0, 0]}>
            {sheets.map((sheet, index) => (
                <FloorPhotoSheet key={index} sheet={sheet} index={index} />
            ))}
        </group>
    );
};

const Floor = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[160, 80]} />
        <meshBasicMaterial color="#ffffff" />
    </mesh>
);

const PlatformBox = ({ pos, size, platformKey, color, url }) => {
    const ref = useRef(null);
    const { camera } = useThree();
    const half = size / 2;
    const tex = useMemo(() => buildLogoTexture(platformKey, color), [platformKey, color]);

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
            position={[0, -0.6, 0]}
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

const ScrollCamera = ({ cfgRef, progressRef, releaseOffsetRef }) => {
    const lookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }) => {
        const c = cfgRef.current;
        const stops = c.stops;
        const segCount = stops.length - 1;
        const p = THREE.MathUtils.clamp(progressRef.current, 0, 1);
        const segFloat = p * segCount;
        const segIdx = Math.min(Math.floor(segFloat), segCount - 1);
        const lt = segFloat - segIdx;
        const e = lt * lt * (3 - 2 * lt);

        const a = stops[segIdx];
        const b = stops[segIdx + 1];
        const pos = lerpVec(a.pos, b.pos, e);
        const look = lerpVec(a.look, b.look, e);
        const fov = lerp(a.fov, b.fov, e);
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

// Iframe is rendered at IFRAME_PX_PER_UNIT * worldUnits CSS pixels and then
// scaled by 1/IFRAME_PX_PER_UNIT so its visual size matches the world plane.
// Higher value = sharper site rendering at the same on-screen footprint, at
// the cost of layout cost inside the iframe. 256 ≈ desktop browser density.
const IFRAME_PX_PER_UNIT = 256;

const PortfolioItem = ({ pos, url, label, size = [4.5, 6] }) => {
    const [w, h] = size;
    const cssW = Math.round(w * IFRAME_PX_PER_UNIT);
    const cssH = Math.round(h * IFRAME_PX_PER_UNIT);

    return (
        <group position={pos}>
            <mesh position={[0, h / 2 + 0.1, -0.02]}>
                <planeGeometry args={[w + 0.18, h + 0.18]} />
                <meshBasicMaterial color="#1a1a1a" toneMapped={false} />
            </mesh>
            {url ? (
                <Html
                    transform
                    position={[0, h / 2 + 0.1, 0]}
                    scale={1 / IFRAME_PX_PER_UNIT}
                    zIndexRange={[5, 0]}
                    pointerEvents="auto"
                >
                    <iframe
                        src={url}
                        title={label || 'portfolio'}
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        style={{
                            width: `${cssW}px`,
                            height: `${cssH}px`,
                            border: 0,
                            background: '#ffffff',
                            display: 'block',
                            borderRadius: '8px',
                        }}
                    />
                </Html>
            ) : (
                <mesh position={[0, h / 2 + 0.1, 0]}>
                    <planeGeometry args={[w, h]} />
                    <meshBasicMaterial color="#dcdcdc" toneMapped={false} />
                </mesh>
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
                url={it.url}
                label={it.label}
            />
        ))}
    </>
);

const Scene = ({ releases, cfgRef, progressRef, releaseOffsetRef, floorTextZ, photoZ, billboard, stack, support, simple, portfolio }) => (
    <>
        <ScrollCamera cfgRef={cfgRef} progressRef={progressRef} releaseOffsetRef={releaseOffsetRef} />
        <FogSync cfgRef={cfgRef} />
        <fog attach="fog" args={['#ffffff', 14, 32]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 12, 8]} intensity={0.55} />
        <Floor />
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
                    <Billboard release={r} x={i * RELEASE_SPACING} billboard={billboard} />
                </Suspense>
                <FloorPhotoSheets x={i * RELEASE_SPACING} z={photoZ} seed={i * 7} />
                <FloorText release={r} x={i * RELEASE_SPACING} z={floorTextZ} />
                {!simple && <SupportFloorText x={i * RELEASE_SPACING} support={support} />}
            </React.Fragment>
        ))}
        {portfolio && portfolio.length > 0 && <PortfolioItems items={portfolio} />}
    </>
);

// ================ SoundCloud Widget API ================

let scScriptPromise = null;
const loadScScript = () => {
    if (window.SC) return Promise.resolve();
    if (scScriptPromise) return scScriptPromise;
    scScriptPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://w.soundcloud.com/player/api.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('SC API failed'));
        document.head.appendChild(s);
    });
    return scScriptPromise;
};

const downsampleSamples = (samples, bins) => {
    if (!samples?.length || bins <= 0) return [];
    const max = Math.max(1, ...samples);
    const step = samples.length / bins;
    const out = [];
    for (let i = 0; i < bins; i++) {
        const start = Math.floor(i * step);
        const end = Math.max(start + 1, Math.floor((i + 1) * step));
        let peak = 0;
        for (let j = start; j < end && j < samples.length; j++) {
            if (samples[j] > peak) peak = samples[j];
        }
        out.push(Math.max(0.12, peak / max));
    }
    return out;
};

const fetchWaveformSamples = async (waveformUrl, bins) => {
    if (!waveformUrl) return null;
    const jsonUrl = waveformUrl.replace(/\.png(\?.*)?$/, '.json$1');
    try {
        const res = await fetch(jsonUrl);
        if (!res.ok) return null;
        const data = await res.json();
        if (!Array.isArray(data?.samples)) return null;
        return downsampleSamples(data.samples, bins);
    } catch { return null; }
};

const useScWidget = (url, waveformBins = 36) => {
    const iframeRef = useRef(null);
    const widgetRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [samples, setSamples] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setPlaying(false);
        setReady(false);
        setSamples(null);
        setProgress(0);
        if (!url || !iframeRef.current) return;
        let cancelled = false;
        loadScScript().then(() => {
            if (cancelled || !iframeRef.current || !window.SC) return;
            const w = window.SC.Widget(iframeRef.current);
            widgetRef.current = w;
            const onReady = () => {
                setReady(true);
                w.getCurrentSound((sound) => {
                    if (cancelled || !sound?.waveform_url) return;
                    fetchWaveformSamples(sound.waveform_url, waveformBins).then((arr) => {
                        if (!cancelled && arr) setSamples(arr);
                    });
                });
            };
            const onPlay = () => setPlaying(true);
            const onPause = () => setPlaying(false);
            const onFinish = () => { setPlaying(false); setProgress(0); };
            const onProgress = (e) => {
                if (typeof e?.relativePosition === 'number') setProgress(e.relativePosition);
            };
            w.bind(window.SC.Widget.Events.READY, onReady);
            w.bind(window.SC.Widget.Events.PLAY, onPlay);
            w.bind(window.SC.Widget.Events.PAUSE, onPause);
            w.bind(window.SC.Widget.Events.FINISH, onFinish);
            w.bind(window.SC.Widget.Events.PLAY_PROGRESS, onProgress);
        }).catch(() => {});
        return () => {
            cancelled = true;
            const w = widgetRef.current;
            if (w) {
                try {
                    w.unbind(window.SC.Widget.Events.READY);
                    w.unbind(window.SC.Widget.Events.PLAY);
                    w.unbind(window.SC.Widget.Events.PAUSE);
                    w.unbind(window.SC.Widget.Events.FINISH);
                    w.unbind(window.SC.Widget.Events.PLAY_PROGRESS);
                } catch { /* ignore */ }
            }
            widgetRef.current = null;
        };
    }, [url, waveformBins]);

    const toggle = useCallback(() => {
        const w = widgetRef.current;
        if (!w || !ready) return;
        w.toggle();
    }, [ready]);

    const seek = useCallback((rel) => {
        const w = widgetRef.current;
        if (!w || !ready) return;
        w.getDuration((d) => {
            if (typeof d !== 'number' || d <= 0) return;
            w.seekTo(rel * d);
            w.play();
        });
    }, [ready]);

    return { iframeRef, playing, ready, samples, progress, toggle, seek };
};

// ================ player UI ================

const FAKE_BARS = Array.from({ length: 36 }).map((_, i) => {
    // deterministic pseudo-waveform
    const v = Math.sin(i * 0.55) * 0.5 + Math.sin(i * 1.3) * 0.3 + 0.5;
    return Math.max(0.18, Math.min(1, v));
});

const WAVE_BINS = 48;

const Player = ({ release, onPrev, onNext, canPrev, canNext }) => {
    const url = (release?.soundcloudTrackUrl || release?.soundcloudUrl || '').split('?')[0];
    const { iframeRef, playing, ready, samples, progress, toggle, seek } = useScWidget(url, WAVE_BINS);
    const title = release ? `${release.artists || ''} — ${release.title || ''}`.replace(/^—\s*|\s*—\s*$/g, '') : '';
    const bars = samples?.length ? samples : FAKE_BARS;

    const onWaveClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seek(rel);
    };

    return (
        <div className="hn-player">
            <button
                className="hn-player-nav"
                onClick={onPrev}
                disabled={!canPrev}
                aria-label="Previous release"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            </button>

            <div className="hn-player-pill">
                <div className="hn-player-title">{title}</div>
                <div className="hn-player-row">
                    <button
                        className="hn-player-play"
                        onClick={toggle}
                        disabled={!url || !ready}
                        aria-label={playing ? 'Pause' : 'Play'}
                    >
                        {playing ? (
                            <svg viewBox="0 0 24 24" width="20" height="20"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M7 4 L20 12 L7 20 Z" fill="currentColor" /></svg>
                        )}
                    </button>

                    <div
                        className="hn-player-wave"
                        role="slider"
                        aria-label="Track position"
                        aria-valuemin={0}
                        aria-valuemax={1}
                        aria-valuenow={progress}
                        onClick={ready ? onWaveClick : undefined}
                    >
                        {bars.map((h, i) => {
                            const pos = (i + 0.5) / bars.length;
                            const played = pos <= progress;
                            return (
                                <span
                                    key={i}
                                    className={`hn-player-bar${played ? ' played' : ''}`}
                                    style={{ height: `${h * 100}%` }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            <button
                className="hn-player-nav"
                onClick={onNext}
                disabled={!canNext}
                aria-label="Next release"
            >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
            </button>

            {url && (
                <iframe
                    ref={iframeRef}
                    title="sc-widget"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false`}
                    allow="autoplay"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, border: 0, pointerEvents: 'none' }}
                />
            )}
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

const Vec3Block = ({ title, vec, setVec }) => (
    <div className="dbg-block">
        <div className="dbg-title">{title}</div>
        {['x', 'y', 'z'].map((k) => (
            <Row key={k} label={k.toUpperCase()} value={vec[k]} onChange={(v) => setVec({ ...vec, [k]: v })} />
        ))}
    </div>
);

const DebugPanel = ({ cfg, setCfg, currentIndex, goTo, progressRef, onSaveToServer, onResetServer }) => {
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
                <Row label="art y"  value={cfg.billboard.artistY}    min={-3}  max={5}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistY: v } })} />
                <Row label="art z"  value={cfg.billboard.artistZ}    min={-3}  max={3}  step={0.05} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistZ: v } })} />
                <Row label="art sz" value={cfg.billboard.artistSize} min={0.1} max={2}  step={0.02} onChange={(v) => setCfg({ ...cfg, billboard: { ...cfg.billboard, artistSize: v } })} />
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
}) => {
    const { releases, siteSettings, updateSiteSettings } = useData();

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
            if (hydrated) setCfg(hydrated);
        }
    }, [serverCfg, saveCfgToServer, loadLocal, serverCfgKey, stopCount]);

    const { progressRef, currentIndex, goTo } = useSnapScroll(cfg.stops.length);
    const releaseSwitcher = useReleaseSwitcher(
        displayItems.length,
        useCallback(() => goTo(0), [goTo]),
    );
    const currentRelease = displayItems[releaseSwitcher.current];

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
            {displayItems.length > 0 && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={{ position: [0, 3, 7], fov: cfg.stops[0].fov }}
                        gl={{ antialias: true, alpha: true }}
                        dpr={[1, 2]}
                    >
                        <Scene
                            releases={displayItems}
                            cfgRef={cfgRef}
                            progressRef={progressRef}
                            releaseOffsetRef={releaseSwitcher.offsetRef}
                            floorTextZ={cfg.floorTextZ}
                            photoZ={cfg.photoZ}
                            billboard={cfg.billboard}
                            stack={cfg.stack}
                            support={cfg.support}
                            simple={simple}
                            portfolio={portfolio}
                        />
                    </Canvas>
                </div>
            )}

            <div className="home-new-gradient" aria-hidden="true" />
            <Header theme={currentIndex === 0 ? 'light' : 'dark'} />
            <StopIndicator count={cfg.stops.length} currentIndex={currentIndex} goTo={goTo} />

            {bottomAction ? (
                <BottomAction
                    label={bottomAction.label}
                    href={bottomAction.href}
                    onPrev={releaseSwitcher.prev}
                    onNext={releaseSwitcher.next}
                    canPrev={releaseSwitcher.current > 0}
                    canNext={releaseSwitcher.current < displayItems.length - 1}
                />
            ) : (!simple && currentRelease && (
                <Player
                    release={currentRelease}
                    onPrev={releaseSwitcher.prev}
                    onNext={releaseSwitcher.next}
                    canPrev={releaseSwitcher.current > 0}
                    canNext={releaseSwitcher.current < displayItems.length - 1}
                />
            ))}

            {showDebug && (
                <DebugPanel
                    cfg={cfg}
                    setCfg={setCfg}
                    currentIndex={currentIndex}
                    goTo={goTo}
                    progressRef={progressRef}
                    onSaveToServer={saveCfg}
                    onResetServer={clearCfg}
                />
            )}
        </div>
    );
};

const HomeNewPage = () => <Scene3DShell serverCfgKey="homeNewConfig" />;

export default HomeNewPage;
