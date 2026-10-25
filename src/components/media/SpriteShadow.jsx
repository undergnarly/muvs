import { useMemo } from 'react';
import { Color, DoubleSide, NormalBlending, Vector2 } from 'three';
import {
    createSpriteShadowLayout, getSpriteShadowMaskBounds, normalizeSpriteShadowSettings,
    SPRITE_SHADOW_FRAGMENT, SPRITE_SHADOW_VERTEX,
} from '../../utils/spriteShadow';

const ORIGIN = Object.freeze([0, 0, 0]);
const NO_CONTACT_BLEND = new Float32Array(4);
const ignoreRaycast = () => {};

function GroundShadow({ texture, useGreen, width, height, position, floorY, config, contactCamera }) {
    const image = texture.image;
    const flipY = texture.flipY !== false;
    const includeFootProfile = Boolean(contactCamera);
    const bounds = useMemo(() => getSpriteShadowMaskBounds(image, { useGreen, flipY, includeFootProfile }), [image, useGreen, flipY, includeFootProfile]);
    const x = position[0] || 0, y = position[1] || 0, z = position[2] || 0;
    const { directionDegrees, length, blur, depthOffset } = config;
    const cx = contactCamera?.[0], cy = contactCamera?.[1], cz = contactCamera?.[2];
    const layout = useMemo(() => createSpriteShadowLayout({ width, height, position: [x, y, z], floorY,
        settings: { enabled: true, opacity: 1, directionDegrees, length, blur, depthOffset },
        bounds, contactCamera: includeFootProfile ? [cx, cy, cz] : undefined,
    }), [width, height, x, y, z, floorY, directionDegrees, length, blur, depthOffset, bounds, includeFootProfile, cx, cy, cz]);
    const uniforms = useMemo(() => ({
        uMask: { value: texture }, uGreen: { value: useGreen ? 1 : 0 },
        uOpacity: { value: config.opacity }, uFootV: { value: layout?.footV || 0 },
        uMaxV: { value: layout?.maxV || 1 }, uMaximumBlur: { value: layout?.maximumBlur || 0 },
        uWorldToUv: { value: new Vector2(...(layout?.worldToUv || [1, 1])) },
        uShadowColor: { value: new Color('#6f746e') },
        fogColor: { value: new Color('#ffffff') }, fogNear: { value: 14 }, fogFar: { value: 32 }, fogDensity: { value: 0 },
    }), [texture, useGreen, config.opacity, layout]);
    const metadata = useMemo(() => ({
        maskChannel: useGreen ? 'green' : 'alpha', alphaBounds: bounds,
        contact: layout?.contact, opaqueFootY: layout?.footY,
        castLength: layout?.length, blurRadius: layout?.maximumBlur,
        depthOffset: layout?.depthOffset, depthShift: layout?.depthShift,
    }), [useGreen, bounds, layout]);
    if (!layout) return null;
    return <mesh name="sprite-ground-shadow" raycast={ignoreRaycast} renderOrder={-4} userData={metadata}>
        <bufferGeometry key={layout.geometryKey}>
            <bufferAttribute attach="attributes-position" args={[layout.positions, 3]} />
            <bufferAttribute attach="attributes-uv" args={[layout.uvs, 2]} />
            <bufferAttribute attach="attributes-contactBlend" args={[layout.contactBlend || NO_CONTACT_BLEND, 1]} />
            <bufferAttribute attach="index" args={[layout.indices, 1]} />
        </bufferGeometry>
        <shaderMaterial key={`${texture.uuid}:${useGreen ? 'green' : 'alpha'}`}
            uniforms={uniforms} vertexShader={SPRITE_SHADOW_VERTEX} fragmentShader={SPRITE_SHADOW_FRAGMENT}
            transparent depthWrite={false} depthTest side={DoubleSide} blending={NormalBlending} toneMapped={false} fog />
    </mesh>;
}

export default function SpriteShadow({ posterTexture, alphaMap, width, height, settings, position = ORIGIN, floorY, contactCamera }) {
    const config = normalizeSpriteShadowSettings(settings);
    const useGreen = Boolean(alphaMap?.image);
    const texture = useGreen ? alphaMap : posterTexture;
    if (!config.enabled || config.opacity <= 0 || !texture?.image || !Number.isFinite(width) || !Number.isFinite(height)
        || width <= 0 || height <= 0) return null;
    return <GroundShadow texture={texture} useGreen={useGreen} width={width} height={height} position={position} floorY={floorY} config={config} contactCamera={contactCamera} />;
}
