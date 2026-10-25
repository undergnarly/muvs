import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DynamicDrawUsage, NormalBlending, Vector3 } from 'three';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import {
    advanceWorldDustField, createWorldDustField, createWorldDustRebaseFrame, sampleWorldDustRebase,
    updateWorldDustField, WORLD_DUST_COUNT, WORLD_DUST_REVEAL_SECONDS,
} from '../../utils/worldDust';
import { createDustWind, impulseDustWind, observeDustGestures, resetDustWind, stepDustWind } from '../../utils/dustWind';

const vertices = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

const vertexShader = `
    uniform float uTime;
    uniform vec3 uWind;
    attribute vec3 aAnchor;
    attribute vec4 aMotion;
    attribute vec2 aStyle;
    attribute float aRise;
    varying vec2 vDisk;
    varying float vAlpha;

    void main() {
        float mass = 0.8 + 0.2 * sin(aMotion.z);
        float rise = mod(aRise + uWind.y * mass, 8.0);
        vec3 center = aAnchor + vec3(
            (sin(uTime * 0.21 + aMotion.z) + sin(uTime * 0.47 + aMotion.z * 1.7) * 0.28) * aMotion.w + uWind.x * mass,
            rise,
            cos(uTime * 0.13 + aMotion.z) * 0.16 + uWind.z * mass
        );
        vec4 viewCenter = modelViewMatrix * vec4(center, 1.0);
        float distanceToCamera = length(viewCenter.xyz);
        float rangeFade = smoothstep(3.0, 5.0, distanceToCamera)
            * (1.0 - smoothstep(12.0, 15.0, distanceToCamera));
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

export default function WorldDust({ hubStateRef } = {}) {
    const camera = useThree((state) => state.camera);
    const mesh = useRef(null);
    const anchors = useRef(null);
    const motion = useRef(null);
    const style = useRef(null);
    const material = useRef(null);
    const rise = useRef(null);
    const field = useMemo(() => createWorldDustField(), []);
    const rebaseFrame = useMemo(() => createWorldDustRebaseFrame(), []);
    const uniforms = useMemo(() => ({ uTime: { value: 0 }, uReveal: { value: 0 }, uWind: { value: new Vector3() } }), []);
    const runtime = useRef({ mode: 'waiting', reveal: 0, elapsed: 0, wind: createDustWind() });

    useEffect(() => observeAtmosphereMotion((mode) => {
        if (mode === 'running' && runtime.current.mode !== 'running') runtime.current.reveal = 0;
        runtime.current.mode = mode;
        if (mode !== 'running') resetDustWind(runtime.current.wind);
    }), []);

    useEffect(() => observeDustGestures((x, y) => {
        const state = runtime.current;
        if (state.mode !== 'running') return;
        const basis = camera.matrixWorld.elements;
        impulseDustWind(state.wind, x, y, basis[0], basis[1], basis[2]);
    }), [camera]);

    useFrame(({ camera: activeCamera }, delta) => {
        if (!mesh.current || !material.current) return;
        const state = runtime.current;
        mesh.current.visible = state.mode === 'running';
        if (state.mode !== 'running') return;
        const rebased = sampleWorldDustRebase(rebaseFrame, activeCamera.position, hubStateRef?.current?.dustRebaseX);
        mesh.current.position.x = rebased.offsetX;
        const step = Math.min(delta, 0.1);
        state.elapsed += step;
        state.reveal = Math.min(1, state.reveal + step / WORLD_DUST_REVEAL_SECONDS);
        material.current.uniforms.uTime.value = state.elapsed;
        material.current.uniforms.uReveal.value = state.reveal * state.reveal * (3 - 2 * state.reveal);
        if (updateWorldDustField(field, rebased.camera)) {
            anchors.current.needsUpdate = true;
            motion.current.needsUpdate = true;
            style.current.needsUpdate = true;
        }
        advanceWorldDustField(field, rebased.camera, step);
        rise.current.needsUpdate = true;
        stepDustWind(state.wind, step);
        material.current.uniforms.uWind.value.set(state.wind.x, state.wind.y, state.wind.z);
    });

    return (
        <mesh ref={mesh} name="muvs-world-dust" frustumCulled={false} visible={false} renderOrder={10} raycast={() => null}>
            <instancedBufferGeometry instanceCount={WORLD_DUST_COUNT}>
                <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
                <bufferAttribute attach="index" args={[indices, 1]} />
                <instancedBufferAttribute ref={anchors} attach="attributes-aAnchor" args={[field.anchors, 3]} usage={DynamicDrawUsage} />
                <instancedBufferAttribute ref={motion} attach="attributes-aMotion" args={[field.motion, 4]} usage={DynamicDrawUsage} />
                <instancedBufferAttribute ref={style} attach="attributes-aStyle" args={[field.style, 2]} usage={DynamicDrawUsage} />
                <instancedBufferAttribute ref={rise} attach="attributes-aRise" args={[field.rise, 1]} usage={DynamicDrawUsage} />
            </instancedBufferGeometry>
            <shaderMaterial ref={material} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms}
                transparent depthWrite={false} depthTest blending={NormalBlending} toneMapped={false} />
        </mesh>
    );
}
