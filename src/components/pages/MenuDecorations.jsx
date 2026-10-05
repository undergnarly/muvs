import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProgressiveTexture } from '../../hooks/useProgressiveTexture';
import { hasMenuBeenRevealed } from '../../utils/menuStartup';
import { getArtworkMotionSnapshot } from '../../utils/objectVideoRuntime';
import {
    createMenuDecorationLayout, createMenuDecorationVisibility, MENU_DECORATION_ASSETS,
} from '../../utils/menuDecorations';

const SESSION_SEED = Math.floor(Math.random() * 4294967296);
const MENU_SPACING = 14;
const ignoreRaycast = () => {};

function LoadedDecorations({ sectionKey, index, hub, stateRef }) {
    const groupRef = useRef(null);
    const materialsRef = useRef([]);
    const visibility = useMemo(() => createMenuDecorationVisibility(), []);
    const frameRef = useRef({ delta: 0, active: true, phase: '', index, selectedIndex: -1, ready: false, settled: false, visible: true, skip: false });
    const width = useThree((state) => state.size.width);
    const height = useThree((state) => state.size.height);
    const source = MENU_DECORATION_ASSETS[sectionKey];
    const texture = useProgressiveTexture(source, { usePreview: false, loadFull: true, fallback: source });
    const layout = useMemo(() => createMenuDecorationLayout({ sectionKey, width, height, hub, seed: SESSION_SEED }), [sectionKey, width, height, hub]);
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
        const opacity = visibility.sample(frame);
        group.visible = Boolean(texture && frame.visible && opacity > 0);
        for (let i = 0; i < materialsRef.current.length; i++) {
            const material = materialsRef.current[i];
            if (material && material.opacity !== opacity) material.opacity = opacity;
        }
    });

    return (
        <group ref={groupRef} name={`menu-decor-${sectionKey}-${index}`} visible={false}>
            {layout.map((prop, i) => (
                <mesh
                    key={i}
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
            ))}
        </group>
    );
}

export default function MenuDecorations({ sectionKey, index, hub, stateRef, active = false }) {
    if (!active || !MENU_DECORATION_ASSETS[sectionKey]) return null;
    return <LoadedDecorations sectionKey={sectionKey} index={index} hub={hub} stateRef={stateRef} />;
}
