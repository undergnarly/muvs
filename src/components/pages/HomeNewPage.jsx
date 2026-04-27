import React, { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll, Text, useTexture } from '@react-three/drei';
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

const Billboard = ({ release }) => {
    const tex = useTexture(release.coverImage || '/uploads/1770869263167-matr_fin2_trans_2.webp');
    React.useEffect(() => {
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

const FloorText = ({ release }) => {
    const description = stripHtml(release.description);
    const meta = release.releaseDate ? `RELEASED · ${release.releaseDate}` : '';

    return (
        <group position={[0, 0.01, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial color="#ffffff" />
    </mesh>
);

// Drives the default camera along a scroll-bound path.
const ScrollCamera = () => {
    const scroll = useScroll();
    const lookAt = React.useRef(new THREE.Vector3());

    useFrame(({ camera }) => {
        const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
        // Smoothstep for nicer easing
        const e = t * t * (3 - 2 * t);

        // Start: close, eye-level with billboard
        // End: pulled back, raised, tilted down toward floor
        camera.position.set(
            0,
            2.6 + e * 4.2,
            6.5 + e * 9.5,
        );
        lookAt.current.set(0, 2.6 - e * 3.0, 0 - e * 2.5);
        camera.lookAt(lookAt.current);
    });

    return null;
};

const Scene = ({ release }) => (
    <>
        <ScrollCamera />
        <color attach="background" args={['#ffffff']} />
        <fog attach="fog" args={['#ffffff', 14, 32]} />
        <ambientLight intensity={1.0} />
        <Floor />
        <Suspense fallback={null}>
            <Billboard release={release} />
        </Suspense>
        <FloorText release={release} />
    </>
);

const HomeNewPage = () => {
    const { releases } = useData();
    const sorted = React.useMemo(
        () => [...(releases || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
        [releases],
    );
    const release = sorted[0];

    return (
        <div className="home-new-page">
            {release && (
                <div className="home-new-canvas">
                    <Canvas
                        camera={{ position: [0, 2.6, 6.5], fov: 50 }}
                        gl={{ antialias: true }}
                        dpr={[1, 2]}
                    >
                        <ScrollControls pages={3} damping={0.22}>
                            <Scene release={release} />
                        </ScrollControls>
                    </Canvas>
                </div>
            )}
            <Header />
        </div>
    );
};

export default HomeNewPage;
