import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
    BufferAttribute, BufferGeometry, GLSL3, Mesh, OrthographicCamera,
    RawShaderMaterial, Scene, WebGLRenderTarget,
} from 'three';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import {
    createGrainientRamp, grainientFieldSize, grainientFrame,
    GRAINIENT_VERTEX_SHADER, GRAINIENT_FIELD_FRAGMENT_SHADER, GRAINIENT_COMPOSITE_FRAGMENT_SHADER,
} from '../../utils/grainient';

// The supplied static/silk field is cached. Only the inexpensive grain composite
// joins the existing scene renderer; there is no second main-page WebGL canvas.
const triangle = new Float32Array(9);

export default function SceneGrainient({ floorView = false }) {
    const { gl, size, viewport } = useThree();
    const material = useRef(null);
    const runtime = useRef({ resources: null, mode: 'waiting', elapsed: 0 });
    const uniforms = useMemo(() => ({
        uField: { value: null }, uFrame: { value: 0 },
        uGrainAmount: { value: 0.04 }, uFieldOpacity: { value: floorView ? 0 : 1 },
    // Initial opacity only; subsequent changes ease inside the existing frame loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), []);

    useEffect(() => observeAtmosphereMotion((mode) => { runtime.current.mode = mode; }), []);

    useEffect(() => {
        const state = runtime.current;
        const dimensions = grainientFieldSize(size.width * viewport.dpr, size.height * viewport.dpr);
        const target = new WebGLRenderTarget(dimensions.width, dimensions.height, { depthBuffer: false, stencilBuffer: false });
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(triangle, 3));
        const fieldMaterial = new RawShaderMaterial({
            glslVersion: GLSL3, vertexShader: GRAINIENT_VERTEX_SHADER,
            fragmentShader: GRAINIENT_FIELD_FRAGMENT_SHADER,
            uniforms: { uAspect: { value: size.width / Math.max(1, size.height) }, uRamp: { value: createGrainientRamp() } },
            depthTest: false, depthWrite: false, toneMapped: false,
        });
        const scene = new Scene();
        const mesh = new Mesh(geometry, fieldMaterial);
        mesh.frustumCulled = false;
        scene.add(mesh);
        const resources = { target, scene, camera: new OrthographicCamera(), dirty: true };
        const restore = () => { resources.dirty = true; };
        gl.domElement.addEventListener('webglcontextrestored', restore);
        state.resources = resources;
        if (material.current) material.current.uniforms.uField.value = target.texture;
        return () => {
            if (state.resources === resources) state.resources = null;
            gl.domElement.removeEventListener('webglcontextrestored', restore);
            target.dispose(); fieldMaterial.dispose(); geometry.dispose();
        };
    }, [gl, size.width, size.height, viewport.dpr]);

    useFrame((_, delta) => {
        const state = runtime.current;
        const resources = state.resources;
        if (!resources || !material.current) return;
        if (resources.dirty) {
            const previous = gl.getRenderTarget();
            gl.setRenderTarget(resources.target);
            gl.render(resources.scene, resources.camera);
            gl.setRenderTarget(previous);
            resources.dirty = false;
        }
        if (state.mode === 'running') state.elapsed += Math.min(delta, 0.1);
        const values = material.current.uniforms;
        values.uFrame.value = grainientFrame(state.elapsed);
        const targetOpacity = floorView ? 0 : 1;
        values.uFieldOpacity.value += (targetOpacity - values.uFieldOpacity.value) * (1 - Math.exp(-Math.min(delta, 0.1) * 8));
        if (Math.abs(targetOpacity - values.uFieldOpacity.value) < 0.001) values.uFieldOpacity.value = targetOpacity;
    }, -100);

    return <mesh name="muvs-grainient" renderOrder={-100} frustumCulled={false} raycast={() => null}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[triangle, 3]} /></bufferGeometry>
        <rawShaderMaterial ref={material} glslVersion={GLSL3} vertexShader={GRAINIENT_VERTEX_SHADER}
            fragmentShader={GRAINIENT_COMPOSITE_FRAGMENT_SHADER} uniforms={uniforms}
            depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>;
}
