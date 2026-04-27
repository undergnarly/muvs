import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, useTexture, Grid } from '@react-three/drei';
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

const DEFAULT_STOPS = [
    { pos: { x: 0, y: 3.0, z: 7.0  }, look: { x: 0, y:  2.6, z: 0.0 }, fov: 40 },
    { pos: { x: 0, y: 5.0, z: 12.0 }, look: { x: 0, y:  0.5, z: 4.0 }, fov: 55 },
    { pos: { x: 0, y: 7.0, z: 17.0 }, look: { x: 0, y: -1.0, z: 7.0 }, fov: 70 },
    { pos: { x: 0, y: 8.5, z: 21.0 }, look: { x: 0, y: -2.0, z: 9.0 }, fov: 80 },
];

const DEFAULT_CFG = {
    stops: DEFAULT_STOPS,
    floorTextZ: 4.0,
    fogNear: 14,
    fogFar: 32,
};

const CFG_STORAGE_KEY = 'muvs:home-new:cfg:v1';

const loadSavedCfg = () => {
    try {
        const raw = localStorage.getItem(CFG_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.stops?.length === DEFAULT_STOPS.length) return parsed;
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
        const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
        const onTouchEnd = (e) => {
            if (touchY == null) return;
            const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
            if (Math.abs(dy) > 40) {
                const dir = dy > 0 ? 1 : -1;
                const next = Math.max(0, Math.min(numStops - 1, indexRef.current + dir));
                if (next !== indexRef.current) {
                    indexRef.current = next;
                    setCurrentIndex(next);
                }
            }
            touchY = null;
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

const useReleaseSwitcher = (count) => {
    const indexRef = useRef(0);
    const offsetRef = useRef(0);
    const [current, setCurrent] = useState(0);

    const setIndex = useCallback((next) => {
        const i = Math.max(0, Math.min(count - 1, next));
        indexRef.current = i;
        setCurrent(i);
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
        prev: () => setIndex(current - 1),
        next: () => setIndex(current + 1),
        goTo: setIndex,
    };
};

// ================ scene parts ================

const Billboard = ({ release, x }) => {
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
                position={[0, 2.55, -0.05]}
                fontSize={0.85}
                color="#0a0a0a"
                anchorX="center"
                anchorY="middle"
                maxWidth={9}
                textAlign="center"
                letterSpacing={-0.02}
            >
                {(release.title || 'UNTITLED').toUpperCase()}
            </Text>

            <Text
                position={[0, 1.8, -0.05]}
                fontSize={0.28}
                color="#666666"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.15}
            >
                {(release.artists || '').toUpperCase()}
            </Text>

            <mesh position={[0, -0.4, 0]}>
                <planeGeometry args={[2.6, 2.6]} />
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
            >
                {description}
            </Text>
        </group>
    );
};

const Floor = () => (
    <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[160, 80]} />
            <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Grid
            position={[0, 0.001, 0]}
            args={[80, 40]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#cccccc"
            sectionSize={5}
            sectionThickness={1.2}
            sectionColor="#888888"
            fadeDistance={28}
            fadeStrength={1.2}
            infiniteGrid={false}
        />
    </>
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

const Scene = ({ releases, cfgRef, progressRef, releaseOffsetRef, floorTextZ }) => (
    <>
        <ScrollCamera cfgRef={cfgRef} progressRef={progressRef} releaseOffsetRef={releaseOffsetRef} />
        <FogSync cfgRef={cfgRef} />
        <color attach="background" args={['#ffffff']} />
        <fog attach="fog" args={['#ffffff', 14, 32]} />
        <ambientLight intensity={1.0} />
        <Floor />
        {releases.map((r, i) => (
            <React.Fragment key={r.id ?? i}>
                <Suspense fallback={null}>
                    <Billboard release={r} x={i * RELEASE_SPACING} />
                </Suspense>
                <FloorText release={r} x={i * RELEASE_SPACING} z={floorTextZ} />
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

const DebugPanel = ({ cfg, setCfg, currentIndex, goTo, progressRef }) => {
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
    const saveCfg = () => {
        try {
            localStorage.setItem(CFG_STORAGE_KEY, JSON.stringify(cfg));
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 900);
        } catch (e) { console.error('save failed', e); }
    };
    const clearSaved = () => {
        try { localStorage.removeItem(CFG_STORAGE_KEY); } catch (_) { /* ignore */ }
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
    const { releases } = useData();

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

    const [cfg, setCfg] = useState(() => loadSavedCfg() || DEFAULT_CFG);
    const cfgRef = useRef(cfg);
    useEffect(() => { cfgRef.current = cfg; }, [cfg]);

    const { progressRef, currentIndex, goTo } = useSnapScroll(STOP_COUNT);
    const releaseSwitcher = useReleaseSwitcher(displayReleases.length);
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
            />
        </div>
    );
};

export default HomeNewPage;
