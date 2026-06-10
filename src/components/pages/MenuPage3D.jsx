import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, useTexture } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import { useData } from '../../context/DataContext';
import { ROUTES } from '../../utils/constants';
import './MenuPage3D.css';

// Same Urbanist faces the music page uses, so the menu reads as one world.
const FONT_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-500-normal.woff';
const FONT_BOLD = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-700-normal.woff';

const FALLBACK_COVER = '/images/logo.png';

const MENU_ITEMS = [
    { key: 'music', label: 'MUSIC', route: ROUTES.MUSIC },
    { key: 'mixes', label: 'MIXES', route: ROUTES.MIXES },
    { key: 'code',  label: 'CODE',  route: ROUTES.CODE },
    { key: 'news',  label: 'NEWS',  route: ROUTES.NEWS },
    { key: 'about', label: 'ABOUT', route: ROUTES.ABOUT },
];

const COUNT = MENU_ITEMS.length;
const STEP = (Math.PI * 2) / COUNT;
const RING_RADIUS = 9;
// Camera idles slightly behind the ring center (opposite the active item) so
// neighbor edges can peek into wide viewports and the active billboard has air.
const CAM_BACK = 2.2;
const CAM_Y = 2.6;
const LOOK_Y = 2.5;
// Dive target when entering a section: forward toward the item and down.
const DIVE_FRAC = 0.7;
const DIVE_Y = 1.0;
const DIVE_LOOK_Y = 0.7;
const FOV_IDLE = 50;
const FOV_DIVE = 64;
const LEAVE_DUR = 0.95; // seconds
const ENTER_DUR = 0.9;

const RETURN_KEY = 'muvs:menu:return';
const RETURN_TTL = 60 * 60 * 1000; // 1h — stale keys don't replay the pull-up
// Ignore enter gestures briefly after mount so leftover scroll momentum from
// the previous page can't immediately dive into a section.
const ENTER_COOLDOWN = 700;

const mod = (n) => ((n % COUNT) + COUNT) % COUNT;
const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

const readReturnInfo = () => {
    try {
        const raw = sessionStorage.getItem(RETURN_KEY);
        if (!raw) return null;
        const v = JSON.parse(raw);
        if (!v?.key || Date.now() - (v.ts || 0) > RETURN_TTL) return null;
        const index = MENU_ITEMS.findIndex((m) => m.key === v.key);
        return index >= 0 ? { index } : null;
    } catch { return null; }
};

// ================ scene ================

const RingCover = ({ url, onClick }) => {
    const tex = useTexture(url || FALLBACK_COVER);
    useEffect(() => {
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
        }
    }, [tex]);

    const imgW = tex?.image?.naturalWidth || tex?.image?.width || 1;
    const imgH = tex?.image?.naturalHeight || tex?.image?.height || 1;
    const { width, height } = useMemo(() => {
        const aspect = imgW / imgH;
        const size = 3.4;
        if (aspect >= 1) return { width: size, height: size / aspect };
        return { width: size * aspect, height: size };
    }, [imgW, imgH]);

    return (
        <mesh onClick={onClick}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
    );
};

const RingItem = ({ item, index, cover, onSelect }) => {
    const theta = index * STEP;
    const onClick = (e) => {
        e.stopPropagation();
        onSelect(index);
    };
    return (
        // Rotating the wrapper by -theta puts the item at (R·sinθ, ·, -R·cosθ)
        // with its face toward the ring center.
        <group rotation={[0, -theta, 0]}>
            <group position={[0, 2.45, -RING_RADIUS]}>
                <Text
                    position={[0, 2.25, -1.2]}
                    fontSize={0.92}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={-0.02}
                    font={FONT_BOLD}
                >
                    {item.label}
                </Text>
                <Text
                    position={[0, 3.0, -1.2]}
                    fontSize={0.26}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.3}
                    font={FONT_REGULAR}
                >
                    {`0${index + 1}`}
                </Text>
                <Suspense fallback={null}>
                    <RingCover url={cover} onClick={onClick} />
                </Suspense>
            </group>
            <group position={[0, 0.01, -RING_RADIUS * 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
                <Text
                    fontSize={0.2}
                    color="#888888"
                    anchorX="center"
                    anchorY="top"
                    letterSpacing={0.18}
                    font={FONT_REGULAR}
                >
                    {`SECTION 0${index + 1} — ${item.label}`}
                </Text>
            </group>
        </group>
    );
};

const Floor = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshBasicMaterial color="#ffffff" />
    </mesh>
);

const MenuCamera = ({ idxRef, transRef, fadeRef, onLeft }) => {
    // Continuous accumulated yaw — never wrapped, so 4 → 5 (=item 0) rotates
    // the short way instead of spinning back around the ring.
    const angleRef = useRef(idxRef.current * STEP);
    const look = useRef(new THREE.Vector3());

    useFrame(({ camera }, delta) => {
        const target = idxRef.current * STEP;
        const a = angleRef.current;
        const na = a + (target - a) * Math.min(1, delta * 5);
        angleRef.current = Math.abs(target - na) < 0.0001 ? target : na;

        const tr = transRef.current;
        if (tr.mode === 'leave') {
            tr.t = Math.min(1, tr.t + delta / LEAVE_DUR);
        } else if (tr.mode === 'enter') {
            tr.t = Math.max(0, tr.t - delta / ENTER_DUR);
            if (tr.t <= 0) tr.mode = 'idle';
        }
        const e = smoothstep(tr.t);

        const dx = Math.sin(angleRef.current);
        const dz = -Math.cos(angleRef.current);

        const px = lerp(-dx * CAM_BACK, dx * RING_RADIUS * DIVE_FRAC, e);
        const pz = lerp(-dz * CAM_BACK, dz * RING_RADIUS * DIVE_FRAC, e);
        const py = lerp(CAM_Y, DIVE_Y, e);
        camera.position.set(px, py, pz);

        look.current.set(dx * RING_RADIUS, lerp(LOOK_Y, DIVE_LOOK_Y, e), dz * RING_RADIUS);
        camera.lookAt(look.current);

        const fov = lerp(FOV_IDLE, FOV_DIVE, e);
        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }

        if (fadeRef.current) {
            const op = tr.mode === 'idle' ? 0 : Math.max(0, Math.min(1, (tr.t - 0.45) / 0.5));
            fadeRef.current.style.opacity = String(op);
        }

        if (tr.mode === 'leave' && tr.t >= 1 && !tr.done) {
            tr.done = true;
            onLeft();
        }
    });

    return null;
};

// ================ page ================

const MenuPage3D = () => {
    const { releases } = useData();
    const navigate = useNavigate();

    // Default item images: music release covers, in site order.
    const covers = useMemo(() => {
        const sorted = [...(releases || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
        return MENU_ITEMS.map((_, i) => {
            const r = sorted.length ? sorted[i % sorted.length] : null;
            return r?.coverImage || FALLBACK_COVER;
        });
    }, [releases]);

    // Returning from a section: start dived-in at that item and pull back up.
    // Read-and-clear atomically in the initializer — clearing in an effect
    // loses the value on StrictMode's dev double-mount.
    const [returnInfo] = useState(() => {
        const info = readReturnInfo();
        try { sessionStorage.removeItem(RETURN_KEY); } catch { /* ignore */ }
        return info;
    });

    const idxRef = useRef(returnInfo?.index ?? 0);
    const [current, setCurrent] = useState(mod(idxRef.current));
    const transRef = useRef(
        returnInfo ? { mode: 'enter', t: 1, done: false } : { mode: 'idle', t: 0, done: false },
    );
    const fadeRef = useRef(null);

    const rotateBy = useCallback((d) => {
        if (transRef.current.mode !== 'idle') return;
        idxRef.current += d;
        setCurrent(mod(idxRef.current));
    }, []);

    const enter = useCallback(() => {
        if (transRef.current.mode !== 'idle') return;
        // Capture the target now — the live index must not be able to drift
        // between the dive starting and navigation firing.
        transRef.current = { mode: 'leave', t: 0, done: false, targetIndex: mod(idxRef.current) };
    }, []);

    const onLeft = useCallback(() => {
        const item = MENU_ITEMS[transRef.current.targetIndex ?? mod(idxRef.current)];
        try {
            sessionStorage.setItem(RETURN_KEY, JSON.stringify({ key: item.key, ts: Date.now() }));
        } catch { /* ignore */ }
        try {
            navigate(item.route);
        } catch {
            // recovery path: never leave the page stuck behind the white fade
            transRef.current = { mode: 'idle', t: 0, done: false };
        }
    }, [navigate]);

    const onSelect = useCallback((index) => {
        if (transRef.current.mode === 'leave') return;
        let d = mod(index - idxRef.current);
        if (d > COUNT / 2) d -= COUNT;
        if (d === 0) enter();
        else rotateBy(d);
    }, [enter, rotateBy]);

    // input: horizontal wheel/swipe/arrows rotate the ring, a deliberate
    // downward scroll / upward swipe / ArrowDown dives into the section.
    useEffect(() => {
        const mountT = Date.now();
        let lastWheel = 0;
        let vAcc = 0;
        let vAccT = 0;

        const tryEnter = () => {
            if (Date.now() - mountT < ENTER_COOLDOWN) return;
            if (transRef.current.mode !== 'idle') return;
            enter();
        };

        const onWheel = (e) => {
            e.preventDefault();
            if (transRef.current.mode === 'leave') return;
            const ax = Math.abs(e.deltaX);
            const ay = Math.abs(e.deltaY);
            const now = Date.now();
            if (ax > ay) {
                if (now - lastWheel < 650 || ax < 6) return;
                lastWheel = now;
                rotateBy(e.deltaX > 0 ? 1 : -1);
            } else if (e.deltaY > 0) {
                // accumulate so a stray momentum tick can't trigger navigation
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
            // pinch/two-finger gestures are not ring gestures
            if (e.touches.length > 1) { touchY = null; touchX = null; }
        };
        const onTouchEnd = (e) => {
            if (touchY == null) return;
            const endY = e.changedTouches[0]?.clientY ?? touchY;
            const endX = e.changedTouches[0]?.clientX ?? touchX;
            const dy = touchY - endY;
            const dx = touchX - endX;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
                rotateBy(dx > 0 ? 1 : -1);
            } else if (dy > Math.abs(dx) && dy > 70) {
                tryEnter();
            }
            touchY = null;
            touchX = null;
        };

        const onKey = (e) => {
            // never hijack keys aimed at focused interactive elements
            if (e.target?.closest?.('button, a, input, textarea, select, [contenteditable]')) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                rotateBy(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                rotateBy(-1);
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
    }, [enter, rotateBy]);

    useEffect(() => {
        document.body.classList.add('home-new-active');
        return () => document.body.classList.remove('home-new-active');
    }, []);

    const activeItem = MENU_ITEMS[current];

    return (
        <div className="home-new-page mp3d">
            <div className="home-new-canvas">
                <Canvas
                    camera={{ position: [0, CAM_Y, CAM_BACK], fov: FOV_IDLE }}
                    gl={{ antialias: true, alpha: true }}
                    dpr={[1, 2]}
                >
                    <MenuCamera idxRef={idxRef} transRef={transRef} fadeRef={fadeRef} onLeft={onLeft} />
                    <fog attach="fog" args={['#ffffff', 14, 32]} />
                    <ambientLight intensity={0.75} />
                    <directionalLight position={[6, 12, 8]} intensity={0.55} />
                    <Floor />
                    {MENU_ITEMS.map((item, i) => (
                        <RingItem key={item.key} item={item} index={i} cover={covers[i]} onSelect={onSelect} />
                    ))}
                </Canvas>
            </div>

            <div className="home-new-gradient" aria-hidden="true" />
            <Header theme="light" />

            <div className="mp3d-counter" aria-hidden="true">
                {String(current + 1).padStart(2, '0')} / {String(COUNT).padStart(2, '0')}
            </div>

            <div className="mp3d-ui">
                <button className="mp3d-nav" onClick={() => rotateBy(-1)} aria-label="Previous section">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M15 6 L9 12 L15 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
                <button className="mp3d-pill" onClick={enter}>{`OPEN ${activeItem.label}`}</button>
                <button className="mp3d-nav" onClick={() => rotateBy(1)} aria-label="Next section">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M9 6 L15 12 L9 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                </button>
            </div>
            <div className="mp3d-hint" aria-hidden="true">scroll down to enter · swipe to rotate</div>

            <div
                className="mp3d-fade"
                ref={fadeRef}
                style={{ opacity: returnInfo ? 1 : 0 }}
                aria-hidden="true"
            />
        </div>
    );
};

export default MenuPage3D;
