import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useProgressiveTexture } from '../../hooks/useProgressiveTexture';
import { hasMenuBeenRevealed } from '../../utils/menuStartup';
import { getArtworkMotionSnapshot } from '../../utils/objectVideoRuntime';
import {
    createMenuDecorationClock, createMenuDecorationLayout, createMenuDecorationVisibility,
    menuDecorationMotion, MENU_DECORATION_ASSETS,
} from '../../utils/menuDecorations';

const SESSION_SEED = Math.floor(Math.random() * 4294967296);
const MENU_SPACING = 14;
const ignoreRaycast = () => {};

const shadowTexture = (() => {
    const size = 32;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4;
        const radius = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
        pixels[offset] = 255;
        pixels[offset + 1] = 255;
        pixels[offset + 2] = 255;
        pixels[offset + 3] = Math.round(255 * Math.max(0, 1 - radius) ** 2);
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
})();

function LoadedDecorations({ sectionKey, index, hub, stateRef }) {
    const groupRef = useRef(null);
    const materialsRef = useRef([]);
    const shadowsRef = useRef([]);
    const meshesRef = useRef([]);
    const visibility = useMemo(() => createMenuDecorationVisibility(), []);
    const motionClock = useMemo(() => createMenuDecorationClock(), []);
    const frameRef = useRef({ delta: 0, active: true, phase: '', index, selectedIndex: -1, ready: false, settled: false, visible: true, skip: false, travel: 0, direction: 1, rendered: false });
    const width = useThree((state) => state.size.width);
    const height = useThree((state) => state.size.height);
    const source = MENU_DECORATION_ASSETS[sectionKey];
    const texture = useProgressiveTexture(source, { usePreview: false, loadFull: true, fallback: source });
    const layout = useMemo(() => createMenuDecorationLayout({ sectionKey, width, height, hub, seed: SESSION_SEED }), [sectionKey, width, height, hub]);
    const motionOffsets = useMemo(() => layout.map(() => ({ y: 0, yaw: 0, roll: 0 })), [layout]);
    const imageWidth = texture?.image?.naturalWidth || texture?.image?.width || 1;
    const imageHeight = texture?.image?.naturalHeight || texture?.image?.height || 1;
    const longestSide = Math.max(imageWidth, imageHeight);
    const planeSize = useMemo(() => [imageWidth / longestSide, imageHeight / longestSide], [imageWidth, imageHeight, longestSide]);

    useFrame((_, delta) => {
        const group = groupRef.current;
        if (!group) return;
        const state = stateRef?.current;
        const preferences = getArtworkMotionSnapshot();
        const frame = frameRef.current;
        frame.delta = delta;
        frame.phase = state?.phase;
        frame.index = index;
        frame.selectedIndex = state?.menuIndex;
        frame.ready = hasMenuBeenRevealed();
        frame.settled = Boolean(state && Math.abs(state.angle - index * MENU_SPACING) < 0.025);
        frame.visible = !(preferences & 2);
        frame.skip = Boolean(preferences & 12);
        frame.travel = state?.tt;
        frame.direction = state?.dir;
        const opacity = visibility.sample(frame);
        group.visible = Boolean(texture && frame.visible && opacity > 0);
        for (let i = 0; i < materialsRef.current.length; i++) {
            const material = materialsRef.current[i];
            if (material && material.opacity !== opacity) material.opacity = opacity;
            const shadow = shadowsRef.current[i];
            if (shadow && shadow.opacity !== opacity * 0.1) shadow.opacity = opacity * 0.1;
        }
        if (sectionKey === 'code' && group.visible) {
            frame.rendered = true;
            const elapsed = motionClock.sample(frame);
            for (let i = 0; i < layout.length; i++) {
                const mesh = meshesRef.current[i];
                if (!mesh) continue;
                const offset = menuDecorationMotion(layout[i], elapsed, motionOffsets[i], !frame.skip);
                mesh.position.y = layout[i].position[1] + offset.y;
                mesh.rotation.y = layout[i].rotation[1] + offset.yaw;
                mesh.rotation.z = layout[i].rotation[2] + offset.roll;
            }
        }
    });

    return (
        <group ref={groupRef} name={`menu-decor-${sectionKey}-${index}`} visible={false}>
            {layout.map((prop, i) => (
                <group key={i}>
                    {prop.shadow && (
                        <mesh position={prop.shadow.position} rotation={[-Math.PI / 2, 0, 0]} raycast={ignoreRaycast} renderOrder={-3}>
                            <planeGeometry args={prop.shadow.size} />
                            <meshBasicMaterial ref={(material) => { shadowsRef.current[i] = material; }} map={shadowTexture} color="#000000" transparent opacity={0} depthWrite={false} toneMapped={false} />
                        </mesh>
                    )}
                    <mesh
                        ref={(mesh) => { meshesRef.current[i] = mesh; }}
                        position={prop.position}
                        rotation={prop.rotation}
                        scale={prop.scale}
                        raycast={ignoreRaycast}
                        renderOrder={-2}
                    >
                        <planeGeometry args={planeSize} />
                        <meshBasicMaterial
                            ref={(material) => { materialsRef.current[i] = material; }}
                            map={texture}
                            transparent
                            opacity={0}
                            depthWrite={false}
                            toneMapped={false}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

export default function MenuDecorations({ sectionKey, index, hub, stateRef, active = false }) {
    if (!active || !MENU_DECORATION_ASSETS[sectionKey]) return null;
    return <LoadedDecorations sectionKey={sectionKey} index={index} hub={hub} stateRef={stateRef} />;
}
