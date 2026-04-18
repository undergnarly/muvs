import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Header from '../layout/Header';
import './ThreeDPage.css';

const Cube = () => (
    <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.1} />
    </mesh>
);

const ThreeDPage = () => {
    return (
        <div className="three-d-page">
            <div className="three-d-canvas">
                <Canvas
                    shadows
                    camera={{ position: [5, 3, 5], fov: 45 }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={['#ffffff']} />

                    <ambientLight intensity={0.6} />
                    <directionalLight
                        position={[5, 8, 5]}
                        intensity={0.9}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />

                    <Cube />

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        minPolarAngle={Math.PI / 2}
                        maxPolarAngle={Math.PI / 2}
                        target={[0, 0, 0]}
                    />
                </Canvas>
            </div>

            <div className="three-d-gradient" aria-hidden="true" />

            <Header />
        </div>
    );
};

export default ThreeDPage;
