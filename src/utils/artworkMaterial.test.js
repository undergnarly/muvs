import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { MeshBasicMaterial, Texture } from 'three';

const source = readFileSync(new URL('../components/media/ArtworkMaterial.jsx', import.meta.url), 'utf8');
const { code } = transformSync(source, { loader: 'jsx', format: 'cjs', jsxFactory: 'createElement' });

// Evaluate the actual JSX component with only its two hook dependencies stubbed.
// No canvas/GPU is needed to inspect the resulting Three material contract.
const renderMaterial = (props) => {
    const uploaded = [];
    const gl = { initTexture: texture => uploaded.push(texture) };
    const module = { exports: {} };
    runInNewContext(code, {
        module,
        exports: module.exports,
        require: name => {
            if (name === 'react') return { useLayoutEffect: effect => effect() };
            if (name === '@react-three/fiber') return { useThree: select => select({ gl }) };
            throw new Error(`Unexpected dependency: ${name}`);
        },
        createElement: (type, elementProps) => ({ type, props: elementProps }),
    });
    const element = module.exports.default(props);
    const { key, ...materialProps } = element.props;
    assert.equal(element.type, 'meshBasicMaterial');
    return { material: new MeshBasicMaterial(materialProps), key, uploaded };
};

test('poster artwork retains its texture at any scene-fog distance instead of becoming white', () => {
    const poster = new Texture({ width: 8, height: 8 });
    const { material, uploaded } = renderMaterial({ posterTexture: poster });
    assert.equal(material.fog, false);
    assert.equal(material.map, poster);
    assert.equal(material.alphaMap, null);
    assert.equal(material.opacity, 1);
    assert.equal(material.transparent, true);
    assert.equal(material.alphaTest, .01);
    assert.equal(material.toneMapped, false);
    assert.deepEqual(uploaded, [poster]);
    material.dispose();
    poster.dispose();
});

test('video artwork also bypasses fog without changing its color or silhouette textures', () => {
    const poster = new Texture({ width: 8, height: 8 });
    const texture = new Texture({ width: 8, height: 8 });
    const alphaMap = new Texture({ width: 8, height: 8 });
    const { material, key, uploaded } = renderMaterial({ posterTexture: poster, video: { texture, alphaMap } });
    assert.equal(material.fog, false);
    assert.equal(material.map, texture);
    assert.equal(material.alphaMap, alphaMap);
    assert.equal(material.opacity, 1);
    assert.equal(material.transparent, true);
    assert.equal(material.alphaTest, .01);
    assert.equal(key, `${texture.uuid}:${alphaMap.uuid}`);
    assert.deepEqual(uploaded, [texture, alphaMap]);
    material.dispose();
    for (const map of [poster, texture, alphaMap]) map.dispose();
});

test('incomplete video keeps the prepared poster, and absent artwork remains invisible', () => {
    const poster = new Texture({ width: 8, height: 8 });
    const texture = new Texture({ width: 8, height: 8 });
    const fallback = renderMaterial({ posterTexture: poster, video: { texture } });
    assert.equal(fallback.material.map, poster);
    assert.equal(fallback.material.alphaMap, null);
    assert.deepEqual(fallback.uploaded, [poster]);
    const empty = renderMaterial({});
    assert.equal(empty.material.opacity, 0);
    assert.equal(empty.material.map, null);
    assert.equal(empty.material.alphaMap, null);
    assert.deepEqual(empty.uploaded, []);
    fallback.material.dispose();
    empty.material.dispose();
    poster.dispose();
    texture.dispose();
});
