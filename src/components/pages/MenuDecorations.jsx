import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { preloadTexture } from '../../hooks/useProgressiveTexture';
import { hasMenuBeenRevealed } from '../../utils/menuStartup';
import { getArtworkMotionSnapshot } from '../../utils/objectVideoRuntime';
import MenuAnalogProp from './MenuAnalogProp';
import { applyMenuPropOpacity } from '../../utils/menuPropSurface';
import {
    createMenuDecorationLayout, createMenuDecorationTextureCache, createMenuDecorationTimeline,
    menuDecorationMotion, MENU_DECORATION_ASSETS,
} from '../../utils/menuDecorations';

const MENU_SPACING = 14;
const ignoreRaycast = () => {};
const optionalTextures = createMenuDecorationTextureCache(preloadTexture);

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

function LoadedDecorations({ sectionKey, index, hub, stateRef, timeline }) {
    const groupRef = useRef(null);
    const materialsRef = useRef([]);
    const shadowsRef = useRef([]);
    const meshesRef = useRef([]);
    const propsRef = useRef([]);
    const decorationTimeline = useMemo(() => timeline || createMenuDecorationTimeline(), [timeline]);
    const frameRef = useRef({ delta: 0, active: true, phase: '', index, selectedIndex: -1, ready: false, settled: false, visible: true, skip: false, travel: 0, direction: 1, rendered: false });
    const width = useThree((state) => state.size.width);
    const height = useThree((state) => state.size.height);
    const layout = useMemo(() => createMenuDecorationLayout({ sectionKey, width, height, hub }), [sectionKey, width, height, hub]);
    const motionOffsets = useMemo(() => layout.map(() => ({ y: 0, yaw: 0, roll: 0 })), [layout]);
    const shadows = useMemo(() => layout.map((prop) => {
        if (!prop.shadow) return [];
        const yaw = prop.model?.kind === 'cassette' ? prop.model.pose === 'flat' ? prop.rotation[2] : prop.rotation[1]
            : prop.model?.pose === 'standing' ? -prop.rotation[2] : 0;
        return [
            { position: prop.shadow.position, size: [prop.shadow.size[0] * 1.45, prop.shadow.size[1] * 1.7], yaw, opacity: 0.16 },
            { position: [prop.shadow.position[0], prop.shadow.position[1] + 0.001, prop.shadow.position[2]],
                size: [prop.shadow.size[0] * 0.86, prop.shadow.size[1] * 0.68], yaw, opacity: 0.3 },
        ];
    }), [layout]);
    const textureRecords = useMemo(() => layout.map((prop) => prop.model ? null : optionalTextures.get(prop.asset.src)), [layout]);
    useEffect(() => {
        for (const record of textureRecords) if (record) optionalTextures.start(record);
    }, [textureRecords]);

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
        const opacity = decorationTimeline.sample(frame);
        group.visible = Boolean(frame.visible && opacity > 0);
        frame.rendered = false;
        for (let i = 0; i < layout.length; i++) {
            const texture = textureRecords[i]?.texture;
            const visible = Boolean(layout[i].model || texture);
            const prop = propsRef.current[i];
            if (prop) prop.visible = visible;
            const materials = materialsRef.current[i];
            if (layout[i].model && materials) applyMenuPropOpacity(materials, opacity);
            else if (materials) for (let m = 0; m < materials.length; m++) {
                const material = materials[m];
                if (!material) continue;
                if (material.map !== texture) {
                    material.map = texture;
                    material.needsUpdate = true;
                }
                if (material.opacity !== opacity) material.opacity = opacity;
            }
            for (let s = 0; s < shadows[i].length; s++) {
                const shadow = shadowsRef.current[i]?.[s];
                const shadowOpacity = opacity * shadows[i][s].opacity;
                if (shadow && shadow.opacity !== shadowOpacity) shadow.opacity = shadowOpacity;
            }
            if (visible && group.visible) frame.rendered = true;
        }
        if (sectionKey === 'code' && frame.rendered) {
            const elapsed = decorationTimeline.sampleMotion(frame);
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
                <group key={prop.model ? `${prop.model.kind}-${prop.model.variant}-${i}` : prop.asset.src + i} ref={(group) => { propsRef.current[i] = group; }} visible={false}>
                    {shadows[i].map((shadow, s) => (
                        <mesh key={s} position={shadow.position} rotation={[-Math.PI / 2, 0, shadow.yaw]} raycast={ignoreRaycast} renderOrder={-3}>
                            <planeGeometry args={shadow.size} />
                            <meshBasicMaterial ref={(material) => {
                                if (!shadowsRef.current[i]) shadowsRef.current[i] = [];
                                shadowsRef.current[i][s] = material;
                            }} map={shadowTexture} color="#000000" transparent opacity={0} depthWrite={false} toneMapped={false} />
                        </mesh>
                    ))}
                    {prop.model ? <MenuAnalogProp prop={prop} meshRef={(mesh) => { meshesRef.current[i] = mesh; }} onMaterialRef={(slot, material) => {
                        if (!materialsRef.current[i]) materialsRef.current[i] = [];
                        materialsRef.current[i][slot] = material;
                    }} /> : <mesh
                        ref={(mesh) => { meshesRef.current[i] = mesh; }}
                        position={prop.position}
                        rotation={prop.rotation}
                        scale={prop.scale}
                        raycast={ignoreRaycast}
                        renderOrder={-2}
                    >
                        <planeGeometry args={prop.planeSize} />
                        <meshBasicMaterial
                            ref={(material) => {
                                if (!materialsRef.current[i]) materialsRef.current[i] = [];
                                materialsRef.current[i][0] = material;
                            }}
                            transparent
                            opacity={0}
                            depthWrite={false}
                            toneMapped={false}
                        />
                    </mesh>}
                </group>
            ))}
        </group>
    );
}

export default function MenuDecorations({ sectionKey, index, hub, stateRef, timeline, active = false }) {
    if (!active || !MENU_DECORATION_ASSETS[sectionKey]) return null;
    return <LoadedDecorations sectionKey={sectionKey} index={index} hub={hub} stateRef={stateRef} timeline={timeline} />;
}
