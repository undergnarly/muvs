import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getObjectLoop, getObjectPosterSrc, isObjectPosterReady } from './objectLoops.js';

test('Music uses the same cleaned single-lizard poster for loading and fallback', () => {
    const canonical = '/images/menu/music2.webp';
    assert.equal(getObjectPosterSrc(canonical), '/videos/objects/music-v3-poster.webp');
    assert.equal(isObjectPosterReady({ image: { currentSrc: `https://muvs.dev${getObjectPosterSrc(canonical)}` } }, canonical), true);
    assert.equal(isObjectPosterReady({ image: { src: `https://muvs.dev${canonical}` } }, canonical), false);
});

test('all menu loops provide exact-first-frame posters alongside video and alpha', () => {
    for (const canonical of ['/images/menu/music2.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp']) {
        const loop = getObjectLoop(canonical);
        assert.match(loop.posterSrc, /-v3-poster\.webp$/);
        assert.match(loop.videoSrc, /-v3\.mp4$/);
        assert.match(loop.alphaMaskSrc, /-alpha\.png$/);
    }
});

test('preview readiness recognizes the cleaned poster rather than the rejected original', () => {
    const canonical = '/images/menu/music2.webp';
    const image = { src: `https://muvs.dev/api/image-preview?src=${encodeURIComponent(getObjectPosterSrc(canonical))}` };
    assert.equal(isObjectPosterReady({ image }, canonical), true);
    image.src = `https://muvs.dev/api/image-preview?src=${encodeURIComponent(canonical)}`;
    assert.equal(isObjectPosterReady({ image }, canonical), false);
});

test('unregistered covers remain static and unchanged', () => {
    assert.equal(getObjectPosterSrc('/uploads/custom-cover.webp'), '/uploads/custom-cover.webp');
    assert.equal(getObjectLoop('/uploads/custom-cover.webp'), null);
    assert.equal(getObjectLoop('__proto__'), null);
    assert.equal(getObjectLoop(null), null);
    assert.equal(isObjectPosterReady(null, '/uploads/custom-cover.webp'), false);
});
