import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CODE_ENTRANCE } from '../../data/codeEntrance';
import { sampleEntranceVisuals, writeLidPositions } from '../../utils/artworkEntranceVisuals';

const codeLayers = { status: 'idle', textures: null };
function requestCodeLayers() {
    if (codeLayers.status !== 'idle') return;
    codeLayers.status = 'loading';
    const loader = new THREE.TextureLoader();
    Promise.allSettled([CODE_ENTRANCE.baseSrc, CODE_ENTRANCE.lidSrc, CODE_ENTRANCE.foregroundSrc].map((url) => (
        loader.loadAsync(url).then((texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            return texture;
        })
    ))).then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
            results.forEach((result) => { if (result.status === 'fulfilled') result.value.dispose(); });
            codeLayers.status = 'error';
            return;
        }
        codeLayers.textures = results.map((result) => result.value);
        codeLayers.status = 'ready';
    });
}

const dustVertex = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const dustFragment = `
uniform float uTime;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main() {
    float t = max(0.0,uTime);
    float life = smoothstep(0.0,0.13,t)*(1.0-smoothstep(0.65,1.78,t));
    vec2 p = vUv;
    float wisps = 0.0;
    for(int i=0;i<7;i++) {
        float seed=float(i);
        float side=mod(seed,2.0)*2.0-1.0;
        float spread=(0.14+0.055*seed)*(1.0-exp(-2.5*t));
        vec2 centre=vec2(0.5+side*spread,0.24+0.20*t+(0.028+0.007*seed)*sin(min(t,1.6)*1.3));
        vec2 radius=vec2(0.085+0.054*t,0.055+0.07*t)*(0.78+0.065*seed);
        vec2 d=(p-centre)/radius;
        float cloud=exp(-dot(d,d)*1.6);
        float grain=noise(p*37.0+vec2(side*t*1.1,-t*2.2)+seed);
        grain=0.63*grain+0.37*noise(p*73.0-vec2(t,-t)+seed);
        wisps+=cloud*smoothstep(0.17,0.76,grain);
    }
    float alpha=min(0.34,wisps*0.32)*life;
    alpha*=smoothstep(0.08,0.2,p.y);
    if(alpha<0.002) discard;
    gl_FragColor=vec4(vec3(0.25,0.226,0.195),alpha);
    #include <colorspace_fragment>
}
`;

function assignMap(material, map, alphaMap = null) {
    if (!material || material.map === map && material.alphaMap === alphaMap) return;
    material.map = map;
    material.alphaMap = alphaMap;
    material.needsUpdate = true;
}

export default function ArtworkEntrance({ poster, posterTexture, video, width, height, entranceRef, meshRef }) {
    const material = useRef(null);
    const dust = useRef(null);
    const lid = useRef(null);
    const foreground = useRef(null);
    const landing = useRef(null);
    const lastOffset = useRef(0);
    const sample = useRef({});
    const code = poster === '/images/menu/code2.webp';
    const music = poster === '/images/menu/music2.webp';
    const dustUniforms = useMemo(() => ({ uTime: { value: -1 } }), []);
    const lidGeometry = useMemo(() => {
        if (!code) return null;
        const geometry = new THREE.BufferGeometry();
        const { left, top, width: boxWidth, height: boxHeight } = CODE_ENTRANCE.lidBounds;
        const right = left + boxWidth;
        const bottom = top + boxHeight;
        const n = CODE_ENTRANCE.sourceSize;
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([
            left / n, 1 - top / n, right / n, 1 - top / n,
            left / n, 1 - bottom / n, right / n, 1 - bottom / n,
        ]), 2));
        geometry.setIndex([0, 2, 1, 2, 3, 1]);
        return geometry;
    }, [code]);
    useEffect(() => () => { lidGeometry?.dispose(); }, [lidGeometry]);

    // R3F's imperative frame boundary: mutate GPU resources and shared refs,
    // never React state, so playback doesn't cause per-frame component renders.
    /* eslint-disable react-hooks/immutability */
    useFrame(() => {
        const state = entranceRef?.current;
        const surface = meshRef.current;
        if (!surface || !material.current) return;
        if (code && state) {
            if (state.allowed) requestCodeLayers();
            state.assetsReady = codeLayers.status === 'ready';
            state.mediaStatus = codeLayers.status === 'idle' ? 'loading' : codeLayers.status;
        }
        const entering = state?.allowed && (state.phase === 'intro' || state.phase === 'pending');
        const elapsed = entering ? state.elapsed : 2.4;
        sampleEntranceVisuals(state?.kind, elapsed, sample.current);
        const visual = sample.current;
        const offset = entering && music ? visual.offset * height : 0;
        surface.position.y += offset - lastOffset.current;
        lastOffset.current = offset;
        const reveal = code && entering ? (state.assetsReady ? THREE.MathUtils.smoothstep(elapsed, 0, 0.16) : 0) : visual.opacity;
        material.current.opacity = posterTexture ? entering ? reveal : 1 : 0;
        const glow = entering ? visual.glow : 0;
        material.current.color.setRGB(1 + 1.75 * glow, 1 + 1.48 * glow, 1 + 0.96 * glow);
        const layered = code && entering && state.assetsReady && elapsed < 2.22;
        assignMap(material.current, layered ? codeLayers.textures[0] : video?.texture || posterTexture || null,
            layered ? null : video?.alphaMap || null);
        if (dust.current) {
            const time = entering ? visual.dustTime : -1;
            dust.current.visible = time >= 0 && time < 1.8;
            dust.current.position.y = -0.36 * height - offset;
            dust.current.material.uniforms.uTime.value = time;
        }
        if (lid.current) {
            lid.current.visible = layered;
            foreground.current.visible = layered;
            landing.current.visible = layered && elapsed > 2.02;
            if (layered) {
                assignMap(lid.current.material, codeLayers.textures[1]);
                assignMap(foreground.current.material, codeLayers.textures[2]);
                lid.current.material.opacity = reveal;
                foreground.current.material.opacity = reveal;
                assignMap(landing.current.material, posterTexture);
                landing.current.material.opacity = THREE.MathUtils.smoothstep(elapsed, 2.02, 2.22);
                writeLidPositions(lidGeometry.attributes.position.array, CODE_ENTRANCE.lidBounds,
                    CODE_ENTRANCE.hinge, width, height, visual.lid, CODE_ENTRANCE.sourceSize);
                lidGeometry.attributes.position.needsUpdate = true;
            }
        }
    });
    /* eslint-enable react-hooks/immutability */

    return (
        <>
            <meshBasicMaterial ref={material} map={posterTexture || null} transparent toneMapped={false} />
            {music && (
                <mesh ref={dust} visible={false} position={[0, -0.36 * height, 0.012]} raycast={() => null}>
                    <planeGeometry args={[width * 1.5, height * 0.42]} />
                    <shaderMaterial vertexShader={dustVertex} fragmentShader={dustFragment} uniforms={dustUniforms}
                        transparent depthWrite={false} toneMapped={false} />
                </mesh>
            )}
            {code && (
                <>
                    <mesh ref={lid} geometry={lidGeometry} visible={false} frustumCulled={false} raycast={() => null}>
                        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
                    </mesh>
                    <mesh ref={foreground} position={[0, 0, 0.008]} visible={false} raycast={() => null}>
                        <planeGeometry args={[width, height]} />
                        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} />
                    </mesh>
                    <mesh ref={landing} position={[0, 0, 0.012]} visible={false} raycast={() => null}>
                        <planeGeometry args={[width, height]} />
                        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} opacity={0} />
                    </mesh>
                </>
            )}
        </>
    );
}
