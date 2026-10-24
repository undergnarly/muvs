import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DynamicDrawUsage, NormalBlending } from 'three';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import {
    createWorldDustField, updateWorldDustField, WORLD_DUST_COUNT, WORLD_DUST_REVEAL_SECONDS,
} from '../../utils/worldDust';

const vertices = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const vertexShader = `
    uniform float uTime;
    attribute vec3 aAnchor;
    attribute vec4 aMotion;
    attribute vec2 aStyle;
    varying vec2 vDisk;
    varying float vAlpha;

    void main() {
        float rise = mod(aMotion.x + uTime * aMotion.y, 8.0);
        vec3 center = aAnchor + vec3(
            sin(uTime * 0.11 + aMotion.z) * aMotion.w,
            rise,
            cos(uTime * 0.07 + aMotion.z) * 0.12
        );
        vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
        float distanceToCamera = length(viewCenter.xyz);
        float rangeFade = smoothstep(3.0, 5.0, distanceToCamera)
            * (1.0 - smoothstep(12.0, 15.5, distanceToCamera));
        float wrapFade = smoothstep(0.0, 0.8, rise) * (1.0 - smoothstep(7.2, 8.0, rise));
        vAlpha = aStyle.y * rangeFade * wrapFade * smoothstep(0.08, 0.8, center.y);
        vDisk = position.xy * 2.0;
        viewCenter.xy += position.xy * aStyle.x * 2.0;
        gl_Position = projectionMatrix * viewCenter;
    }
`;

const fragmentShader = `
    uniform float uReveal;
    varying vec2 vDisk;
    varying float vAlpha;

    void main() {
        float radius = length(vDisk);
        float disc = 1.0 - smoothstep(0.32, 1.0, radius);
        float alpha = disc * vAlpha * uReveal;
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(vec3(1.0), alpha);
        #include <colorspace_fragment>
    }
`;

export default function WorldDust() {
    const mesh = useRef(null);
    const anchors = useRef(null);
    const motion = useRef(null);
    const style = useRef(null);
    const material = useRef(null);
    const field = useMemo(() => createWorldDustField(), []);
    const uniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 } }), []);
    const runtime = useRef({ mode: 'waiting', reveal: 0, elapsed: 0 });

    useEffect(() => observeAtmosphereMotion((mode) => {
        if (mode === 'running' && runtime.current.mode !== 'running') runtime.current.reveal = 0;
        runtime.current.mode = mode;
    }), []);

    useFrame(({ camera }, delta) => {
        if (!mesh.current || !material.current) return;
        const state = runtime.current;
        mesh.current.visible = state.mode === 'running';
        if (state.mode !== 'running') return;
        const step = Math.min(delta, 0.1);
        state.elapsed += step;
        state.reveal = Math.min(1, state.reveal + step / WORLD_DUST_REVEAL_SECONDS);
        material.current.uniforms.uTime.value = state.elapsed;
        material.current.uniforms.uReveal.value = state.reveal * state.reveal * (3 - 2 * state.reveal);
        if (updateWorldDustField(field, camera.position)) {
            anchors.current.needsUpdate = true;
            motion.current.needsUpdate = true;
            style.current.needsUpdate = true;
        }
    });

    return (
        <mesh ref={mesh} name="muvs-world-dust" frustumCulled={false} visible={false} renderOrder={10} raycast={() => null}>
            <instancedBufferGeometry instanceCount={WORLD_DUST_COUNT}>
                <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
                <bufferAttribute attach="index" args={[indices, 1]} />
                <instancedBufferAttribute ref={anchors} attach="attributes-aAnchor" args={[field.anchors, 3]} usage={DynamicDrawUsage} />
                <instancedBufferAttribute ref={motion} attach="attributes-aMotion" args={[field.motion, 4]} usage={DynamicDrawUsage} />
                <instancedBufferAttribute ref={style} attach="attributes-aStyle" args={[field.style, 2]} usage={DynamicDrawUsage} />
            </instancedBufferGeometry>
            <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms}
                transparent depthWrite={false} depthTest blending={NormalBlending} toneMapped={false} />
        </mesh>
    );
}
