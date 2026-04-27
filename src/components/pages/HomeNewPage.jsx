import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
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

const STOP_COUNT = 4;
const RELEASE_SPACING = 14;
const FALLBACK_COVER = '/uploads/1770869263167-matr_fin2_trans_2.webp';

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

const CFG_STORAGE_KEY = 'muvs:home-new:cfg:v1';

const hydrateCfg = (cfg) => {
    if (cfg?.stops?.length !== DEFAULT_STOPS.length) return null;
    return {
        ...DEFAULT_CFG,
        ...cfg,
        billboard: { ...DEFAULT_BILLBOARD, ...(cfg.billboard || {}) },
        stack: { ...DEFAULT_STACK, ...(cfg.stack || {}), pos: { ...DEFAULT_STACK.pos, ...(cfg.stack?.pos || {}) } },
        support: { ...DEFAULT_SUPPORT, ...(cfg.support || {}), pos: { ...DEFAULT_SUPPORT.pos, ...(cfg.support?.pos || {}) } },
    };
};

const loadSavedCfg = () => {
    try {
        const raw = localStorage.getItem(CFG_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return hydrateCfg(parsed);
    } catch (_) { /* ignore */ }
    return null;
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
    const tex = useTexture(release.coverImage || FALLBACK_COVER);
    useEffect(() => {
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
        }
    }, [tex]);

    return (
        <group position={[x, 2.6, 0]}>
            <Text
                position={[0, billboard.titleY, billboard.titleZ]}
                fontSize={billboard.titleSize}
                color="#0a0a0a"
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
                color="#666666"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.15}
                font={FONT_REGULAR}
            >
                {(release.artists || '').toUpperCase()}
            </Text>

            <mesh position={[0, billboard.coverY, 0]}>
                <planeGeometry args={[billboard.coverSize, billboard.coverSize]} />
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

const FLOOR_PHOTO_SHEETS = [
    { x: 4.7, y: -0.45, r: -0.18, color: '#f7f4ec', image: '#d9dfe3' },
    { x: 5.55, y: 0.55, r: 0.1, color: '#fbfaf6', image: '#e2d7cb' },
    { x: 3.95, y: 0.85, r: 0.22, color: '#f3f0e8', image: '#cfd8d2' },
];

const FloorPhotoSheet = ({ sheet }) => (
    <group position={[sheet.x, sheet.y, 0]} rotation={[0, 0, sheet.r]}>
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

const FloorPhotoSheets = ({ x, z }) => (
    <group position={[x, 0.018, z]} rotation={[-Math.PI / 2, 0, 0]}>
        {FLOOR_PHOTO_SHEETS.map((sheet, index) => (
            <FloorPhotoSheet key={index} sheet={sheet} />
        ))}
    </group>
);

const Floor = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[160, 80]} />
        <meshBasicMaterial color="#ffffff" />
    </mesh>
);

const PlatformBox = ({ pos, size, label, color, url }) => {
    const ref = useRef(null);
    const { camera } = useThree();
    const half = size / 2;

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
                <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
            </mesh>
            <Text
                position={[0, 0, half + 0.005]}
                fontSize={size * 0.13}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                font={FONT_BOLD}
                letterSpacing={0.04}
                raycast={() => null}
            >
                {label}
            </Text>
            <Text
                position={[0, 0, -(half + 0.005)]}
                rotation={[0, Math.PI, 0]}
                fontSize={size * 0.13}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                font={FONT_BOLD}
                letterSpacing={0.04}
                raycast={() => null}
            >
                {label}
            </Text>
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
                label={p.label}
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

const Scene = ({ releases, cfgRef, progressRef, releaseOffsetRef, floorTextZ, billboard, stack, support }) => (
    <>
        <ScrollCamera cfgRef={cfgRef} progressRef={progressRef} releaseOffsetRef={releaseOffsetRef} />
        <FogSync cfgRef={cfgRef} />
        <color attach="background" args={['#ffffff']} />
        <fog attach="fog" args={['#ffffff', 14, 32]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[6, 12, 8]} intensity={0.55} />
        <Floor />
        <Physics gravity={[0, -9.81, 0]}>
            {/* Invisible fixed floor collider so platform boxes can rest on it */}
            <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[80, 0.5, 40]} position={[0, -0.5, 0]} />
            </RigidBody>
            {releases.map((r, i) => (
                <PlatformStack key={`stack-${r.id ?? i}`} release={r} x={i * RELEASE_SPACING} stackCfg={stack} />
            ))}
        </Physics>
        {releases.map((r, i) => (
            <React.Fragment key={r.id ?? i}>
                <Suspense fallback={null}>
                    <Billboard release={r} x={i * RELEASE_SPACING} billboard={billboard} />
                </Suspense>
                <FloorText release={r} x={i * RELEASE_SPACING} z={floorTextZ} />
                <FloorPhotoSheets x={i * RELEASE_SPACING} z={floorTextZ} />
                <SupportFloorText x={i * RELEASE_SPACING} support={support} />
            </React.Fragment>
        ))}
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

const useScWidget = (url) => {
    const iframeRef = useRef(null);
    const widgetRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setPlaying(false);
        setReady(false);
        if (!url || !iframeRef.current) return;
        let cancelled = false;
        loadScScript().then(() => {
            if (cancelled || !iframeRef.current || !window.SC) return;
            const w = window.SC.Widget(iframeRef.current);
            widgetRef.current = w;
            const onReady = () => setReady(true);
            const onPlay = () => setPlaying(true);
            const onPause = () => setPlaying(false);
            const onFinish = () => setPlaying(false);
            w.bind(window.SC.Widget.Events.READY, onReady);
            w.bind(window.SC.Widget.Events.PLAY, onPlay);
            w.bind(window.SC.Widget.Events.PAUSE, onPause);
            w.bind(window.SC.Widget.Events.FINISH, onFinish);
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
                } catch (_) { /* ignore */ }
            }
            widgetRef.current = null;
        };
    }, [url]);

    const toggle = useCallback(() => {
        const w = widgetRef.current;
        if (!w || !ready) return;
        w.toggle();
    }, [ready]);

    return { iframeRef, playing, ready, toggle };
};

// ================ player UI ================

const FAKE_BARS = Array.from({ length: 36 }).map((_, i) => {
    // deterministic pseudo-waveform
    const v = Math.sin(i * 0.55) * 0.5 + Math.sin(i * 1.3) * 0.3 + 0.5;
    return Math.max(0.18, Math.min(1, v));
});

const Player = ({ release, onPrev, onNext, canPrev, canNext }) => {
    const url = (release?.soundcloudTrackUrl || release?.soundcloudUrl || '').split('?')[0];
    const { iframeRef, playing, ready, toggle } = useScWidget(url);
    const title = release ? `${release.artists || ''} — ${release.title || ''}`.replace(/^—\s*|\s*—\s*$/g, '') : '';

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

                <div className="hn-player-wave" aria-hidden="true">
                    {FAKE_BARS.map((h, i) => (
                        <span key={i} className="hn-player-bar" style={{ height: `${h * 100}%` }} />
                    ))}
                </div>

                <div className="hn-player-title">{title}</div>
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
            localStorage.setItem(CFG_STORAGE_KEY, JSON.stringify(cfg));
            await onSaveToServer?.(cfg);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 900);
        } catch (e) { console.error('save failed', e); }
    };
    const clearSaved = async () => {
        try { localStorage.removeItem(CFG_STORAGE_KEY); } catch (_) { /* ignore */ }
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

// ================ page ================

const HomeNewPage = () => {
    const { releases, siteSettings, updateSiteSettings } = useData();

    const displayReleases = React.useMemo(() => {
        const sorted = [...(releases || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        if (sorted.length >= 2) return sorted;
        if (sorted.length === 1) {
            return [
                sorted[0],
                { ...sorted[0], id: `${sorted[0].id ?? 'demo'}-2`, title: `${sorted[0].title || 'Untitled'} II` },
            ];
        }
        return [];
    }, [releases]);

    const [cfg, setCfg] = useState(() => loadSavedCfg() || hydrateCfg(siteSettings?.homeNewConfig) || DEFAULT_CFG);
    const cfgRef = useRef(cfg);
    useEffect(() => { cfgRef.current = cfg; }, [cfg]);
    const localCfgSyncedRef = useRef(false);

    const saveCfgToServer = useCallback((nextCfg) => {
        const hydrated = hydrateCfg(nextCfg);
        if (!hydrated) return;
        updateSiteSettings({
            ...siteSettings,
            homeNewConfig: hydrated,
        });
    }, [siteSettings, updateSiteSettings]);

    const resetServerCfg = useCallback(() => {
        const { homeNewConfig, ...rest } = siteSettings || {};
        updateSiteSettings(rest);
    }, [siteSettings, updateSiteSettings]);

    useEffect(() => {
        const localCfg = loadSavedCfg();
        if (localCfg && !localCfgSyncedRef.current) {
            localCfgSyncedRef.current = true;
            setCfg(localCfg);
            if (JSON.stringify(siteSettings?.homeNewConfig) !== JSON.stringify(localCfg)) {
                saveCfgToServer(localCfg);
            }
            return;
        }

        if (!localCfg) {
            const serverCfg = hydrateCfg(siteSettings?.homeNewConfig);
            if (serverCfg) setCfg(serverCfg);
        }
    }, [siteSettings?.homeNewConfig, saveCfgToServer]);

    const { progressRef, currentIndex, goTo } = useSnapScroll(STOP_COUNT);
    const releaseSwitcher = useReleaseSwitcher(
        displayReleases.length,
        useCallback(() => goTo(0), [goTo]),
    );
    const currentRelease = displayReleases[releaseSwitcher.current];

    useEffect(() => {
        document.body.classList.add('home-new-active');
        return () => document.body.classList.remove('home-new-active');
    }, []);

    return (
        <div className="home-new-page">
            {displayReleases.length > 0 && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={{ position: [0, 3, 7], fov: cfg.stops[0].fov }}
                        gl={{ antialias: true }}
                        dpr={[1, 2]}
                    >
                        <Scene
                            releases={displayReleases}
                            cfgRef={cfgRef}
                            progressRef={progressRef}
                            releaseOffsetRef={releaseSwitcher.offsetRef}
                            floorTextZ={cfg.floorTextZ}
                            billboard={cfg.billboard}
                            stack={cfg.stack}
                            support={cfg.support}
                        />
                    </Canvas>
                </div>
            )}

            <div className="home-new-gradient" aria-hidden="true" />
            <Header />
            <StopIndicator count={STOP_COUNT} currentIndex={currentIndex} goTo={goTo} />

            {currentRelease && (
                <Player
                    release={currentRelease}
                    onPrev={releaseSwitcher.prev}
                    onNext={releaseSwitcher.next}
                    canPrev={releaseSwitcher.current > 0}
                    canNext={releaseSwitcher.current < displayReleases.length - 1}
                />
            )}

            <DebugPanel
                cfg={cfg}
                setCfg={setCfg}
                currentIndex={currentIndex}
                goTo={goTo}
                progressRef={progressRef}
                onSaveToServer={saveCfgToServer}
                onResetServer={resetServerCfg}
            />
        </div>
    );
};

export default HomeNewPage;
