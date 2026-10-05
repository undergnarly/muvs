import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createMenuPropGeometry } from '../../utils/menuPropGeometry';
import { createMenuPropSurface } from '../../utils/menuPropSurface';

const ignoreRaycast = () => {};
const geometries = new Map();
const textures = new Map();
const hubRing = new THREE.RingGeometry(0.027, 0.079, 24);
const hubPin = new THREE.CircleGeometry(0.024, 16);
const reelTape = new THREE.CylinderGeometry(0.368, 0.368, 0.022, 32, 1);
const reelHub = new THREE.CylinderGeometry(0.089, 0.089, 0.07, 24, 1);

function sharedGeometry(kind) {
    if (!geometries.has(kind)) geometries.set(kind, createMenuPropGeometry(kind));
    return geometries.get(kind);
}

function sharedTexture(model) {
    const variant = Math.abs(Math.trunc(Number.isFinite(model.variant) ? model.variant : 0)) % 8;
    const key = `${model.kind}:${variant}`;
    if (!textures.has(key)) {
        const surface = createMenuPropSurface(model);
        const texture = new THREE.DataTexture(surface.pixels, surface.width, surface.height);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 2;
        texture.needsUpdate = true;
        textures.set(key, texture);
    }
    return textures.get(key);
}

export default function MenuAnalogProp({ prop, meshRef, onMaterialRef }) {
    const model = prop.model;
    const geometry = useMemo(() => sharedGeometry(model.kind), [model.kind]);
    const texture = useMemo(() => sharedTexture(model), [model]);
    return (
        <group ref={meshRef} name={`menu-analog-${model.kind}-${model.variant}`} position={prop.position} rotation={prop.rotation} scale={prop.scale}>
            <mesh geometry={geometry} raycast={ignoreRaycast}>
                <meshStandardMaterial ref={(material) => onMaterialRef(0, material)} map={texture} color="#ffffff" roughness={0.56} metalness={0.32} opacity={0} transparent depthWrite={false} toneMapped={false} />
            </mesh>
            {model.kind === 'cassette' && [-0.24, 0.24].map((x, side) => (
                <React.Fragment key={side}>
                    <mesh geometry={hubRing} position={[x, 0, 0.0605]} raycast={ignoreRaycast}>
                        <meshStandardMaterial ref={(material) => onMaterialRef(1 + side * 2, material)} color="#b49156" roughness={0.49} metalness={0.36} opacity={0} transparent depthWrite={false} toneMapped={false} />
                    </mesh>
                    <mesh geometry={hubPin} position={[x, 0, 0.0607]} raycast={ignoreRaycast}>
                        <meshStandardMaterial ref={(material) => onMaterialRef(2 + side * 2, material)} color="#393322" roughness={0.8} metalness={0.1} opacity={0} transparent depthWrite={false} toneMapped={false} />
                    </mesh>
                </React.Fragment>
            ))}
            {model.kind === 'reel' && <>
                <mesh geometry={reelTape} raycast={ignoreRaycast}>
                    <meshStandardMaterial ref={(material) => onMaterialRef(1, material)} color="#3b291b" roughness={0.84} metalness={0.08} opacity={0} transparent depthWrite={false} toneMapped={false} />
                </mesh>
                <mesh geometry={reelHub} raycast={ignoreRaycast}>
                    <meshStandardMaterial ref={(material) => onMaterialRef(2, material)} color="#b79052" roughness={0.52} metalness={0.36} opacity={0} transparent depthWrite={false} toneMapped={false} />
                </mesh>
            </>}
        </group>
    );
}
