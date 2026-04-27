import React, { Suspense, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Text, useTexture, Grid } from '@react-three/drei';
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

const DEFAULT_CFG = {
    posStart: { x: 0, y: 3.0, z: 7.0 },
    posEnd:   { x: 0, y: 8.5, z: 21.0 },
    lookStart: { x: 0, y: 2.6, z: 0.0 },
    lookEnd:   { x: 0, y: -2.0, z: 9.0 },
    floorTextZ: 4.0,
    fov: 50,
    fogNear: 14,
    fogFar: 32,
};

const Billboard = ({ release }) => {
    const tex = useTexture(release.coverImage || '/uploads/1770869263167-matr_fin2_trans_2.webp');
    useEffect(() => {
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
        }
    }, [tex]);

    return (
        <group position={[0, 2.6, 0]}>
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

const FloorText = ({ release, z }) => {
    const description = stripHtml(release.description);
    const meta = release.releaseDate ? `RELEASED · ${release.releaseDate}` : '';

    return (
        <group position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
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
            <planeGeometry args={[80, 80]} />
            <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Grid
            position={[0, 0.001, 0]}
            args={[40, 40]}
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
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 30]} />
            <meshBasicMaterial color="#ff4444" />
        </mesh>
        <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[0.04, 30]} />
            <meshBasicMaterial color="#4488ff" />
        </mesh>
    </>
);

// Reads from a mutable cfgRef each frame so the debug panel can mutate
// without causing scene re-renders.
const ScrollCamera = ({ cfgRef, scrollProgressRef }) => {
    const scroll = useScroll();
    const lookAt = useRef(new THREE.Vector3());

    useFrame(({ camera }) => {
        const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
        if (scrollProgressRef) scrollProgressRef.current = t;
        const e = t * t * (3 - 2 * t);

        const c = cfgRef.current;
        camera.position.set(
            c.posStart.x + e * (c.posEnd.x - c.posStart.x),
            c.posStart.y + e * (c.posEnd.y - c.posStart.y),
            c.posStart.z + e * (c.posEnd.z - c.posStart.z),
        );
        lookAt.current.set(
            c.lookStart.x + e * (c.lookEnd.x - c.lookStart.x),
            c.lookStart.y + e * (c.lookEnd.y - c.lookStart.y),
            c.lookStart.z + e * (c.lookEnd.z - c.lookStart.z),
        );
        camera.lookAt(lookAt.current);

        if (camera.fov !== c.fov) {
            camera.fov = c.fov;
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

const Scene = ({ release, cfgRef, scrollProgressRef, floorTextZ }) => (
    <>
        <ScrollCamera cfgRef={cfgRef} scrollProgressRef={scrollProgressRef} />
        <FogSync cfgRef={cfgRef} />
        <color attach="background" args={['#ffffff']} />
        <fog attach="fog" args={['#ffffff', 14, 32]} />
        <ambientLight intensity={1.0} />
        <Floor />
        <Suspense fallback={null}>
            <Billboard release={release} />
        </Suspense>
        <FloorText release={release} z={floorTextZ} />
    </>
);

// ---- Debug panel ----

const Row = ({ label, value, onChange, min = -30, max = 30, step = 0.1 }) => (
    <div className="dbg-row">
        <span className="dbg-label">{label}</span>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="dbg-num"
        />
    </div>
);

const Vec3Block = ({ title, vec, setVec, ranges }) => (
    <div className="dbg-block">
        <div className="dbg-title">{title}</div>
        {['x', 'y', 'z'].map((k) => (
            <Row
                key={k}
                label={k.toUpperCase()}
                value={vec[k]}
                onChange={(v) => setVec({ ...vec, [k]: v })}
                {...(ranges?.[k] || {})}
            />
        ))}
    </div>
);

const DebugPanel = ({ cfg, setCfg, scrollProgressRef }) => {
    const [open, setOpen] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let raf;
        const loop = () => {
            setProgress(scrollProgressRef.current || 0);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [scrollProgressRef]);

    const exportCfg = () => {
        const txt = JSON.stringify(cfg, null, 2);
        navigator.clipboard?.writeText(txt);
        console.log('camera config:', cfg);
    };

    if (!open) {
        return (
            <button className="dbg-toggle" onClick={() => setOpen(true)}>cam</button>
        );
    }

    return (
        <div className="dbg-panel">
            <div className="dbg-head">
                <span>camera tuner</span>
                <span className="dbg-progress">scroll {(progress * 100).toFixed(0)}%</span>
                <button onClick={() => setCfg(DEFAULT_CFG)} className="dbg-btn">reset</button>
                <button onClick={exportCfg} className="dbg-btn">copy</button>
                <button onClick={() => setOpen(false)} className="dbg-btn">×</button>
            </div>

            <Vec3Block title="position · start" vec={cfg.posStart} setVec={(v) => setCfg({ ...cfg, posStart: v })} />
            <Vec3Block title="position · end"   vec={cfg.posEnd}   setVec={(v) => setCfg({ ...cfg, posEnd: v })} />
            <Vec3Block title="lookAt · start"   vec={cfg.lookStart} setVec={(v) => setCfg({ ...cfg, lookStart: v })} />
            <Vec3Block title="lookAt · end"     vec={cfg.lookEnd}   setVec={(v) => setCfg({ ...cfg, lookEnd: v })} />

            <div className="dbg-block">
                <div className="dbg-title">scene</div>
                <Row label="floor txt z" value={cfg.floorTextZ} min={-15} max={20} onChange={(v) => setCfg({ ...cfg, floorTextZ: v })} />
                <Row label="fov"          value={cfg.fov}        min={20}  max={90} step={1} onChange={(v) => setCfg({ ...cfg, fov: v })} />
                <Row label="fog near"     value={cfg.fogNear}    min={0}   max={50} step={0.5} onChange={(v) => setCfg({ ...cfg, fogNear: v })} />
                <Row label="fog far"      value={cfg.fogFar}     min={5}   max={120} step={1} onChange={(v) => setCfg({ ...cfg, fogFar: v })} />
            </div>
        </div>
    );
};

const HomeNewPage = () => {
    const { releases } = useData();
    const sorted = React.useMemo(
        () => [...(releases || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
        [releases],
    );
    const release = sorted[0];

    const [cfg, setCfg] = useState(DEFAULT_CFG);
    const cfgRef = useRef(cfg);
    useEffect(() => { cfgRef.current = cfg; }, [cfg]);

    const scrollProgressRef = useRef(0);

    return (
        <div className="home-new-page">
            {release && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={{ position: [0, 2.6, 6.5], fov: cfg.fov }}
                        gl={{ antialias: true }}
                        dpr={[1, 2]}
                    >
                        <ScrollControls pages={3} damping={0.22}>
                            <Scene
                                release={release}
                                cfgRef={cfgRef}
                                scrollProgressRef={scrollProgressRef}
                                floorTextZ={cfg.floorTextZ}
                            />
                        </ScrollControls>
                    </Canvas>
                </div>
            )}
            <div className="home-new-gradient" aria-hidden="true" />
            <Header />
            <DebugPanel cfg={cfg} setCfg={setCfg} scrollProgressRef={scrollProgressRef} />
        </div>
    );
};

export default HomeNewPage;
