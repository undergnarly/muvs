import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMenuObjectLoops, getObjectLoop, getObjectPosterSrc, isObjectPosterReady } from './objectLoops.js';

test('updated Music photo remains static and cannot be replaced by the old video', () => {
    const canonical = '/images/menu/music-20261005.webp';
    assert.equal(getObjectPosterSrc(canonical), canonical);
    assert.equal(getObjectLoop(canonical), null);
    assert.equal(getObjectLoop('/images/menu/music2.webp'), null);
    assert.equal(isObjectPosterReady({ image: { currentSrc: `https://muvs.dev${getObjectPosterSrc(canonical)}` } }, canonical), true);
    assert.equal(isObjectPosterReady({ image: { src: 'https://muvs.dev/videos/objects/music-v3-poster.webp' } }, canonical), false);
});

test('remaining menu loops provide exact-first-frame posters alongside video and alpha', () => {
    for (const canonical of ['/images/menu/mixes-trans.webp', '/images/menu/code2.webp']) {
        const loop = getObjectLoop(canonical);
        assert.match(loop.posterSrc, /-v3-poster\.webp$/);
        assert.match(loop.videoSrc, /-v3\.mp4$/);
        assert.match(loop.alphaMaskSrc, /-alpha\.png$/);
    }
});

test('preview readiness recognizes an animated poster rather than its original image', () => {
    const canonical = '/images/menu/mixes-trans.webp';
    const image = { src: `https://muvs.dev/api/image-preview?src=${encodeURIComponent(getObjectPosterSrc(canonical))}` };
    assert.equal(isObjectPosterReady({ image }, canonical), true);
    image.src = `https://muvs.dev/api/image-preview?src=${encodeURIComponent(canonical)}`;
    assert.equal(isObjectPosterReady({ image }, canonical), false);
});

test('startup warms only registered loops and skips static Music without null specs', () => {
    const specs = getMenuObjectLoops(['/images/menu/music-20261005.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp']);
    assert.deepEqual(specs.map((spec) => spec.videoSrc), ['/videos/objects/mixes-v3.mp4', '/videos/objects/code-v3.mp4']);
    assert.deepEqual(getMenuObjectLoops(['/images/menu/music-20261005.webp', '/images/menu/music2.webp', null]), []);
});

test('unregistered covers remain static and unchanged', () => {
    assert.equal(getObjectPosterSrc('/uploads/custom-cover.webp'), '/uploads/custom-cover.webp');
    assert.equal(getObjectLoop('/uploads/custom-cover.webp'), null);
    assert.equal(getObjectLoop('__proto__'), null);
    assert.equal(getObjectLoop(null), null);
    assert.equal(isObjectPosterReady(null, '/uploads/custom-cover.webp'), false);
});
