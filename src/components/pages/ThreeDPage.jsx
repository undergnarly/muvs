import React, { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import Header from '../layout/Header';
import './ThreeDPage.css';

const JEEP_URL = '/models/jeep.glb';
useGLTF.preload(JEEP_URL);

const FLOOR_Y = 0;
const MAIN_CUBE_SIZE = 2;
const SIDE_CUBE_SIZE = 1;
const SIDE_DISTANCE = 6;
const COLOR_CYCLE = ['#808080', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#c792ea'];

const useHoverCursor = () => {
    const [hovered, setHovered] = useState(false);
    React.useEffect(() => {
        document.body.style.cursor = hovered ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [hovered]);
    return {
        onPointerOver: (e) => { e.stopPropagation(); setHovered(true); },
        onPointerOut: () => setHovered(false),
        hovered,
    };
};

const Floor = () => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#ffffff" />
    </mesh>
);

const JEEP_SCALE = 2;

const Jeep = () => {
    const { scene } = useGLTF(JEEP_URL);

    const yOffset = useMemo(() => {
        scene.traverse((obj) => {
            if (obj.isMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });
        const box = new THREE.Box3().setFromObject(scene);
        return -box.min.y * JEEP_SCALE;
    }, [scene]);

    return (
        <primitive
            object={scene}
            position={[0, FLOOR_Y + yOffset, 0]}
            scale={JEEP_SCALE}
            rotation={[0, Math.PI / 6, 0]}
        />
    );
};

const CenterFallbackCube = () => (
    <mesh position={[0, FLOOR_Y + MAIN_CUBE_SIZE / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAIN_CUBE_SIZE, MAIN_CUBE_SIZE, MAIN_CUBE_SIZE]} />
        <meshStandardMaterial color="#606060" roughness={0.55} metalness={0.05} />
    </mesh>
);

const TextCube = ({ position, label }) => {
    const { onPointerOver, onPointerOut, hovered } = useHoverCursor();
    return (
        <group position={position}>
            <mesh
                position={[0, SIDE_CUBE_SIZE / 2, 0]}
                castShadow
                receiveShadow
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
                scale={hovered ? 1.08 : 1}
            >
                <boxGeometry args={[SIDE_CUBE_SIZE, SIDE_CUBE_SIZE, SIDE_CUBE_SIZE]} />
                <meshStandardMaterial color="#8a8a8a" roughness={0.5} />
            </mesh>
            <Text
                position={[0, SIDE_CUBE_SIZE + 0.55, 0]}
                fontSize={0.32}
                color="#2a2a2a"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.005}
                outlineColor="#ffffff"
            >
                {label}
            </Text>
        </group>
    );
};

const ColorCube = ({ position }) => {
    const [idx, setIdx] = useState(0);
    const { onPointerOver, onPointerOut, hovered } = useHoverCursor();
    return (
        <mesh
            position={[position[0], position[1] + SIDE_CUBE_SIZE / 2, position[2]]}
            castShadow
            receiveShadow
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % COLOR_CYCLE.length); }}
            scale={hovered ? 1.08 : 1}
        >
            <boxGeometry args={[SIDE_CUBE_SIZE, SIDE_CUBE_SIZE, SIDE_CUBE_SIZE]} />
            <meshStandardMaterial color={COLOR_CYCLE[idx]} roughness={0.4} />
        </mesh>
    );
};

const SpinCube = ({ position }) => {
    const ref = useRef();
    const [spinning, setSpinning] = useState(false);
    const { onPointerOver, onPointerOut, hovered } = useHoverCursor();
    useFrame((_, dt) => {
        if (ref.current && spinning) ref.current.rotation.y += dt * 2.2;
    });
    return (
        <mesh
            ref={ref}
            position={[position[0], position[1] + SIDE_CUBE_SIZE / 2, position[2]]}
            castShadow
            receiveShadow
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onClick={(e) => { e.stopPropagation(); setSpinning((s) => !s); }}
            scale={hovered ? 1.08 : 1}
        >
            <boxGeometry args={[SIDE_CUBE_SIZE, SIDE_CUBE_SIZE, SIDE_CUBE_SIZE]} />
            <meshStandardMaterial color="#8a8a8a" roughness={0.5} />
        </mesh>
    );
};

const BounceCube = ({ position }) => {
    const ref = useRef();
    const [bouncing, setBouncing] = useState(false);
    const t = useRef(0);
    const { onPointerOver, onPointerOut, hovered } = useHoverCursor();
    const baseY = position[1] + SIDE_CUBE_SIZE / 2;
    useFrame((_, dt) => {
        if (!ref.current) return;
        if (bouncing) {
            t.current += dt * 4;
            ref.current.position.y = baseY + Math.abs(Math.sin(t.current)) * 0.9;
        } else if (ref.current.position.y !== baseY) {
            ref.current.position.y = baseY;
        }
    });
    return (
        <mesh
            ref={ref}
            position={[position[0], baseY, position[2]]}
            castShadow
            receiveShadow
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onClick={(e) => { e.stopPropagation(); setBouncing((s) => !s); }}
            scale={hovered ? 1.08 : 1}
        >
            <boxGeometry args={[SIDE_CUBE_SIZE, SIDE_CUBE_SIZE, SIDE_CUBE_SIZE]} />
            <meshStandardMaterial color="#8a8a8a" roughness={0.5} />
        </mesh>
    );
};

const ThreeDPage = () => {
    return (
        <div className="three-d-page">
            <div className="three-d-canvas">
                <Canvas
                    shadows
                    camera={{ position: [10, 6, 10], fov: 45 }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={['#ffffff']} />
                    <fog attach="fog" args={['#ffffff', 22, 55]} />

                    <ambientLight intensity={0.65} />
                    <directionalLight
                        position={[10, 14, 8]}
                        intensity={0.9}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                        shadow-camera-left={-18}
                        shadow-camera-right={18}
                        shadow-camera-top={18}
                        shadow-camera-bottom={-18}
                        shadow-camera-near={0.5}
                        shadow-camera-far={40}
                    />

                    <Floor />
                    <Suspense fallback={<CenterFallbackCube />}>
                        <Jeep />
                    </Suspense>

                    <TextCube position={[0, FLOOR_Y, -SIDE_DISTANCE]} label="MUVS" />
                    <ColorCube position={[SIDE_DISTANCE, FLOOR_Y, 0]} />
                    <SpinCube position={[0, FLOOR_Y, SIDE_DISTANCE]} />
                    <BounceCube position={[-SIDE_DISTANCE, FLOOR_Y, 0]} />

                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={6}
                        maxDistance={22}
                        minPolarAngle={0.15}
                        maxPolarAngle={Math.PI / 2 - 0.05}
                        target={[0, 1, 0]}
                    />
                </Canvas>
            </div>

            <div className="three-d-gradient" aria-hidden="true" />

            <Header />
        </div>
    );
};

export default ThreeDPage;
