import React, { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Text, useTexture } from '@react-three/drei';
import { ROUTES } from '../../utils/constants';
import './RingMenu.css';

// 3D ring menu that lives INSIDE the Scene3DShell canvas (hub mode). The ring
// sits at the world origin; section worlds are placed far along each item's
// outward ray so the camera can physically travel ring → section through fog.

export const HUB_ITEMS = [
    { key: 'music', label: 'MUSIC', route: ROUTES.MUSIC },
    { key: 'mixes', label: 'MIXES', route: ROUTES.MIXES },
    { key: 'code',  label: 'CODE',  route: ROUTES.CODE },
    { key: 'news',  label: 'NEWS',  route: ROUTES.NEWS },
    { key: 'about', label: 'ABOUT', route: ROUTES.ABOUT },
];

export const HUB_COUNT = HUB_ITEMS.length;
export const HUB_STEP = (Math.PI * 2) / HUB_COUNT;
export const HUB_RETURN_KEY = 'muvs:menu:return';

export const hubMod = (n) => ((n % HUB_COUNT) + HUB_COUNT) % HUB_COUNT;
export const hubSmoothstep = (t) => t * t * (3 - 2 * t);

// All hub camera/layout parameters are tunable from the camera tuner and are
// persisted inside the page cfg under cfg.hub.
export const DEFAULT_HUB = {
    ringRadius: 9,    // menu items circle radius
    camDist: 11,      // camera orbit distance beyond the ring (R + camDist from center)
    camY: 2.6,
    lookY: 2.5,
    fov: 50,
    sectionDist: 56,  // distance from world center to the music section origin
    itemSize: 3.4,    // cover plane size
    itemY: 2.45,      // item group height
    travelDur: 1.8,   // seconds for ring → section camera travel
};

export const hubMenuPose = (hub, angle) => {
    const dx = Math.sin(angle);
    const dz = -Math.cos(angle);
    const dist = hub.ringRadius + hub.camDist;
    return {
        pos: { x: dx * dist, y: hub.camY, z: dz * dist },
        look: { x: dx * hub.ringRadius, y: hub.lookY, z: dz * hub.ringRadius },
        fov: hub.fov,
    };
};

const lerpN = (a, b, t) => a + (b - a) * t;
export const lerpPose = (a, b, t) => ({
    pos: { x: lerpN(a.pos.x, b.pos.x, t), y: lerpN(a.pos.y, b.pos.y, t), z: lerpN(a.pos.z, b.pos.z, t) },
    look: { x: lerpN(a.look.x, b.look.x, t), y: lerpN(a.look.y, b.look.y, t), z: lerpN(a.look.z, b.look.z, t) },
    fov: lerpN(a.fov, b.fov, t),
});

const FONT_REGULAR = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-500-normal.woff';
const FONT_BOLD = 'https://cdn.jsdelivr.net/npm/@fontsource/urbanist@5.0.16/files/urbanist-latin-700-normal.woff';
const FALLBACK_COVER = '/images/logo.png';

const RingCover = ({ url, size, onClick }) => {
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
        if (aspect >= 1) return { width: size, height: size / aspect };
        return { width: size * aspect, height: size };
    }, [imgW, imgH, size]);

    return (
        <mesh onClick={onClick}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
    );
};

const RingItem = ({ item, index, cover, hub, onSelect }) => {
    const theta = index * HUB_STEP;
    const onClick = (e) => {
        e.stopPropagation();
        onSelect(index);
    };
    return (
        // Rotating the wrapper by -theta puts the item at (R·sinθ, ·, -R·cosθ);
        // the inner π flip makes it face OUTWARD, toward the orbiting camera.
        <group rotation={[0, -theta, 0]}>
            <group position={[0, hub.itemY, -hub.ringRadius]} rotation={[0, Math.PI, 0]}>
                <Text
                    position={[0, 2.25, -1.2]}
                    fontSize={0.92}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={-0.02}
                    font={FONT_BOLD}
                    material-side={THREE.FrontSide}
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
                    material-side={THREE.FrontSide}
                >
                    {`0${index + 1}`}
                </Text>
                <Suspense fallback={null}>
                    <RingCover url={cover} size={hub.itemSize} onClick={onClick} />
                </Suspense>
            </group>
            {/* floor caption between the outside camera and the item; the π
                flip keeps the flat text upright from the camera's side */}
            <group position={[0, 0.01, -(hub.ringRadius + 3.5)]} rotation={[0, Math.PI, 0]}>
                <group rotation={[-Math.PI / 2, 0, 0]}>
                    <Text
                        fontSize={0.2}
                        color="#888888"
                        anchorX="center"
                        anchorY="top"
                        letterSpacing={0.18}
                        font={FONT_REGULAR}
                        material-side={THREE.FrontSide}
                    >
                        {`SECTION 0${index + 1} — ${item.label}`}
                    </Text>
                </group>
            </group>
        </group>
    );
};

export const RingMenu = ({ hub, covers, onSelect }) => (
    <>
        {HUB_ITEMS.map((item, i) => (
            <RingItem key={item.key} item={item} index={i} cover={covers?.[i]} hub={hub} onSelect={onSelect} />
        ))}
    </>
);
