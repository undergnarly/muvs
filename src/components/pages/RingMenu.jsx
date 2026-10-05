import React, { useMemo } from 'react';
import MenuDecorations from './MenuDecorations';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import { ROUTES } from '../../utils/constants';
import { sanitizeCaptionHtml } from '../../utils/captionRichText';
import { useProgressiveTexture } from '../../hooks/useProgressiveTexture';
import { useObjectVideoTexture } from '../../hooks/useObjectVideoTexture';
import { getObjectPosterSrc } from '../../data/objectLoops';
import { getObjectFallbackSrc } from '../../data/menuArtwork';
import { hasMenuBeenRevealed, markMenuArtworkRendered } from '../../utils/menuStartup';
import { getArtworkMotionSnapshot } from '../../utils/objectVideoRuntime';
import { createMenuTitleStretch } from '../../utils/menuTitleStretch';
import { createMenuDecorationTimeline } from '../../utils/menuDecorations';
import ArtworkMaterial from '../media/ArtworkMaterial';
import { FONT_REGULAR } from '../../data/menuFonts';
import MenuTitle from './MenuTitle';
import './RingMenu.css';

// 3D menu that lives inside the Scene3DShell canvas. Items share the same
// horizontal spacing and camera movement as releases on the music page.

export const HUB_ITEMS = [
    { key: 'music', label: 'MUSIC', route: ROUTES.MUSIC },
    { key: 'about', label: 'ABOUT', route: ROUTES.ABOUT },
    { key: 'code',  label: 'CODE',  route: ROUTES.CODE },
    { key: 'mixes', label: 'MIXES', route: ROUTES.MIXES },
];

export const HUB_COUNT = HUB_ITEMS.length;
export const HUB_SPACING = 14;
export const HUB_RETURN_KEY = 'muvs:menu:return';

export const hubMod = (n) => ((n % HUB_COUNT) + HUB_COUNT) % HUB_COUNT;
export const hubDisplayIndex = (index) => hubMod(-index);
export const hubSmoothstep = (t) => t * t * (3 - 2 * t);

// All hub camera/layout parameters are tunable from the camera tuner and are
// persisted inside the page cfg under cfg.hub.
export const DEFAULT_HUB = {
    ringRadius: 9,    // menu item depth from the world origin
    camDistDesktop: 9.5,
    camDistMobile: 11,
    camY: 2.6,
    lookY: 2.5,
    fov: 50,
    sectionDist: 56,  // distance from world center to the music section origin
    itemSize: 3.4,    // cover plane size
    itemY: 2.45,      // item group height
    captionOffset: -3.05, // floor caption distance toward the camera
    captionY: 0.01,
    captionTilt: 21,
    captionSize: 0.31,
    travelDur: 1.8,   // seconds for ring → section camera travel
};

export const hubCameraDistance = (hub) => {
    const desktop = typeof window === 'undefined' || window.matchMedia('(min-width: 769px)').matches;
    return desktop ? (hub.camDistDesktop ?? 9.5) : (hub.camDistMobile ?? 11);
};

export const hubMenuPose = (hub, offset) => {
    return {
        pos: { x: offset, y: hub.camY, z: -(hub.ringRadius + hubCameraDistance(hub)) },
        look: { x: offset, y: hub.lookY, z: -hub.ringRadius },
        fov: hub.fov,
    };
};

const lerpN = (a, b, t) => a + (b - a) * t;
export const lerpPose = (a, b, t) => ({
    pos: { x: lerpN(a.pos.x, b.pos.x, t), y: lerpN(a.pos.y, b.pos.y, t), z: lerpN(a.pos.z, b.pos.z, t) },
    look: { x: lerpN(a.look.x, b.look.x, t), y: lerpN(a.look.y, b.look.y, t), z: lerpN(a.look.z, b.look.z, t) },
    fov: lerpN(a.fov, b.fov, t),
});

const FALLBACK_COVER = '/images/logo.png';

const particleRandom = (index, salt) => {
    const value = Math.sin((index + 1) * 91.345 + salt * 17.17) * 43758.5453;
    return value - Math.floor(value);
};

const MusicInsectParticles = ({ seed = 0 }) => {
    const ref = React.useRef(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const insects = useMemo(() => Array.from({ length: 26 }, (_, index) => ({
        x: (particleRandom(index, seed + 1) - 0.5) * 4.8,
        y: (particleRandom(index, seed + 2) - 0.5) * 3.4,
        z: (particleRandom(index, seed + 3) - 0.5) * 3.8,
        phase: particleRandom(index, seed + 4) * Math.PI * 2,
        speed: 0.45 + particleRandom(index, seed + 5) * 0.8,
        drift: 0.12 + particleRandom(index, seed + 6) * 0.28,
        size: 0.018 + particleRandom(index, seed + 7) * 0.025,
    })), [seed]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const time = clock.elapsedTime;
        insects.forEach((insect, index) => {
            const motion = time * insect.speed + insect.phase;
            dummy.position.set(
                insect.x + Math.sin(motion * 1.7) * insect.drift + Math.sin(motion * 0.43) * 0.16,
                insect.y + Math.cos(motion * 1.2) * insect.drift * 0.8 + Math.sin(motion * 0.61) * 0.12,
                insect.z + Math.sin(motion * 0.9) * insect.drift * 1.4,
            );
            const flutter = insect.size * (0.82 + Math.sin(motion * 8) * 0.18);
            dummy.scale.set(flutter * 1.8, flutter * 0.65, flutter * 0.65);
            dummy.rotation.set(motion * 0.15, motion, Math.sin(motion) * 0.7);
            dummy.updateMatrix();
            ref.current.setMatrixAt(index, dummy.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={ref} args={[null, null, insects.length]} frustumCulled={false}>
            <sphereGeometry args={[1, 5, 4]} />
            <meshBasicMaterial color="#1b160f" transparent opacity={0.72} depthWrite={false} />
        </instancedMesh>
    );
};

const MixesBronzeParticles = ({ seed = 0 }) => {
    const ref = React.useRef(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const particles = useMemo(() => Array.from({ length: 34 }, (_, index) => ({
        x: (particleRandom(index, seed + 11) - 0.5) * 5.4,
        y: particleRandom(index, seed + 12) * 5.2 - 2.1,
        z: (particleRandom(index, seed + 13) - 0.5) * 5.2,
        phase: particleRandom(index, seed + 14) * Math.PI * 2,
        speed: 0.09 + particleRandom(index, seed + 15) * 0.16,
        size: 0.016 + particleRandom(index, seed + 16) * 0.04,
    })), [seed]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const time = clock.elapsedTime;
        particles.forEach((particle, index) => {
            const y = ((particle.y + 2.1 + time * particle.speed) % 5.2) - 2.1;
            dummy.position.set(
                particle.x + Math.sin(time * 0.23 + particle.phase) * 0.18,
                y,
                particle.z + Math.cos(time * 0.17 + particle.phase) * 0.12,
            );
            const pulse = particle.size * (0.9 + Math.sin(time * 0.7 + particle.phase) * 0.1);
            dummy.scale.setScalar(pulse);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            ref.current.setMatrixAt(index, dummy.matrix);
        });
        ref.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={ref} args={[null, null, particles.length]} frustumCulled={false}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshBasicMaterial color="#a86f3d" transparent opacity={0.68} depthWrite={false} />
        </instancedMesh>
    );
};

const RingCover = ({ url, size, onClick, motionEnabled = false, isMotionSettled }) => {
    const meshRef = React.useRef(null);
    const tex = useProgressiveTexture(getObjectPosterSrc(url) || FALLBACK_COVER, {
        loadFull: true,
        usePreview: false,
        fallback: getObjectFallbackSrc(url) || FALLBACK_COVER,
    });
    const video = useObjectVideoTexture(url, meshRef, {
        posterReady: Boolean(tex), enabled: motionEnabled, isSettled: isMotionSettled,
    });

    const imgW = tex?.image?.naturalWidth || tex?.image?.width || 1;
    const imgH = tex?.image?.naturalHeight || tex?.image?.height || 1;
    const { width, height } = useMemo(() => {
        const aspect = imgW / imgH;
        if (aspect >= 1) return { width: size, height: size / aspect };
        return { width: size * aspect, height: size };
    }, [imgW, imgH, size]);

    return (
        <mesh ref={meshRef} onClick={onClick} onAfterRender={() => { if (motionEnabled && tex) markMenuArtworkRendered(); }}>
            <planeGeometry args={[width, height]} />
            <ArtworkMaterial posterTexture={tex} video={video} />
        </mesh>
    );
};

const RingItem = ({ item, index, logicalIndex, titleTimeline, decorationTimeline, displayIndex, cover, caption, hub, onSelect, captionsVisible, particlesVisible, particleSettings, motionEnabled, decorationsEnabled, stateRef }) => {
    const onClick = (e) => {
        e.stopPropagation();
        onSelect();
    };
    return (
        <group position={[index * HUB_SPACING, 0, 0]}>
            <group position={[0, hub.itemY, -hub.ringRadius]} rotation={[0, Math.PI, 0]}>
                <group>
                <MenuTitle
                    onAfterRender={motionEnabled && item.key === 'about' && !cover ? markMenuArtworkRendered : undefined}
                    label={item.label}
                    logicalIndex={logicalIndex}
                    timeline={titleTimeline}
                    hub={hub}
                />
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
                    {`0${displayIndex + 1}`}
                </Text>
                </group>
                {cover && (
                    <group>
                    <RingCover url={cover} size={hub.itemSize} onClick={onClick} motionEnabled={motionEnabled} isMotionSettled={() => {
                        const state = stateRef?.current;
                        return state?.phase === 'menu' && state.menuIndex === index
                            && Math.abs(state.angle - index * HUB_SPACING) < 0.025;
                    }} />
                    <MenuDecorations sectionKey={item.key} index={index} hub={hub} stateRef={stateRef} timeline={decorationTimeline} active={decorationsEnabled} />
                    </group>
                )}
                <group>
                    {particlesVisible && item.key === 'music' && particleSettings?.music !== false && (
                        <MusicInsectParticles seed={index * 13} />
                    )}
                    {particlesVisible && item.key === 'mixes' && particleSettings?.mixes !== false && (
                        <MixesBronzeParticles seed={index * 17} />
                    )}
                </group>
            </group>
            {/* Floor caption between the camera and the item. */}
            <group>
            <group position={[0, hub.captionY ?? DEFAULT_HUB.captionY, -(hub.ringRadius + (hub.captionOffset ?? DEFAULT_HUB.captionOffset))]} rotation={[0, Math.PI, 0]}>
                <group rotation={[-Math.PI / 2 + THREE.MathUtils.degToRad(hub.captionTilt ?? DEFAULT_HUB.captionTilt), 0, 0]}>
                    <Html
                        transform
                        center
                        distanceFactor={25 * (hub.captionSize ?? DEFAULT_HUB.captionSize)}
                        style={{
                            pointerEvents: 'none',
                            opacity: captionsVisible ? 1 : 0,
                            transition: 'opacity 0.18s ease-out',
                        }}
                    >
                        <div
                            className="mp3d-rich-caption mp3d-menu-caption"
                            dangerouslySetInnerHTML={{
                                __html: sanitizeCaptionHtml(caption ?? `SECTION 0${displayIndex + 1} — ${item.label}`),
                            }}
                        />
                    </Html>
                </group>
            </group>
            </group>
        </group>
    );
};

const LOOP_COPIES = [-1, 0, 1];

export const RingMenu = ({ hub, covers, captions, particleSettings, onSelect, activeIndex = 0, activeOnly = false, captionsVisible = true, particlesVisible = true, videosEnabled = false, decorationsEnabled = videosEnabled, stateRef }) => {
    const titleTimeline = useMemo(() => ({ current: createMenuTitleStretch() }), []);
    const decorationTimeline = useMemo(() => createMenuDecorationTimeline(), []);
    const titleFrame = React.useRef({ delta: 0, index: 0, mobile: false, menu: false, phase: '', ready: false, settled: false, visible: true, skip: false });
    useFrame(({ size }, delta) => {
        const state = stateRef?.current;
        const preferences = getArtworkMotionSnapshot();
        const frame = titleFrame.current;
        frame.delta = delta;
        frame.index = hubMod(state?.menuIndex ?? activeIndex);
        frame.mobile = size.width <= 768;
        frame.menu = state?.phase === 'menu';
        frame.phase = state?.phase;
        frame.ready = hasMenuBeenRevealed();
        frame.settled = Boolean(state && Math.abs(state.angle - state.menuIndex * HUB_SPACING) < 0.025);
        frame.visible = !(preferences & 2);
        frame.skip = Boolean(preferences & 12);
        titleTimeline.current.sample(frame);
        decorationTimeline.select(frame.index);
        if (!decorationsEnabled || !frame.ready || (frame.phase !== 'menu' && frame.phase !== 'travel')) decorationTimeline.visibility.reset();
    }, -1);
    return (
    <>
        {LOOP_COPIES.flatMap((copy) => HUB_ITEMS.map((item, i) => (
            (!activeOnly || i === activeIndex) &&
            <RingItem
                key={`${copy}-${item.key}`}
                item={item}
                index={i + (copy + 1) * HUB_COUNT}
                logicalIndex={i}
                titleTimeline={titleTimeline}
                decorationTimeline={decorationTimeline}
                displayIndex={hubDisplayIndex(i)}
                cover={covers?.[i]}
                caption={captions?.[item.key]}
                hub={hub}
                onSelect={() => onSelect(i)}
                captionsVisible={captionsVisible}
                particlesVisible={particlesVisible}
                particleSettings={particleSettings}
                motionEnabled={videosEnabled && i === activeIndex}
                decorationsEnabled={decorationsEnabled && i === activeIndex}
                stateRef={stateRef}
            />
        )))}
    </>
    );
};
