import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMenuObjectLoops, getObjectLoop, getObjectPosterSrc, isObjectPosterReady } from './objectLoops.js';

test('restored Music uses its matching prior poster and single-lizard loop', () => {
    const canonical = '/images/menu/music2.webp';
    assert.equal(getObjectPosterSrc(canonical), '/videos/objects/music-v3-poster.webp');
    assert.equal(getObjectLoop(canonical).videoSrc, '/videos/objects/music-v3.mp4');
    assert.equal(getObjectLoop('/images/menu/music-20261005.webp'), null);
    assert.equal(isObjectPosterReady({ image: { currentSrc: `https://muvs.dev${getObjectPosterSrc(canonical)}` } }, canonical), true);
    assert.equal(isObjectPosterReady({ image: { src: `https://muvs.dev${canonical}` } }, canonical), false);
});

test('all three menu loops provide exact-first-frame posters alongside video and alpha', () => {
    for (const canonical of ['/images/menu/music2.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp']) {
        const loop = getObjectLoop(canonical);
        assert.match(loop.posterSrc, /-v[34]-(?:decoded-)?poster\.webp$/);
        assert.match(loop.videoSrc, /-v[34]\.mp4$/);
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

test('startup warms restored menu loops but still skips static images without null specs', () => {
    const specs = getMenuObjectLoops(['/images/menu/music2.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp', '/images/menu/about-portrait-v1.webp']);
    assert.deepEqual(specs.map((spec) => spec.videoSrc), ['/videos/objects/music-v3.mp4', '/videos/objects/mixes-v4.mp4', '/videos/objects/code-v4.mp4']);
    assert.deepEqual(getMenuObjectLoops(['/images/menu/music-20261005.webp', '/images/menu/unregistered.webp', null]), []);
});

test('Desktop replacements use version-matched decoded posters, video and original-alpha sidecars', () => {
    for (const [canonical, stem] of [
        ['/images/menu/mixes-trans.webp', 'mixes-v4'],
        ['/images/menu/code2.webp', 'code-v4'],
        ['/uploads/1783951707737-ai-agents_trans.webp', 'agents-v2'],
    ]) {
        assert.deepEqual(getObjectLoop(canonical), {
            posterSrc: `/videos/objects/${stem}-decoded-poster.webp`,
            videoSrc: `/videos/objects/${stem}.mp4`,
            alphaMaskSrc: `/videos/objects/${stem}-alpha.png`, width: 720, height: 720,
        });
    }
});

test('unregistered covers remain static and unchanged', () => {
    assert.equal(getObjectPosterSrc('/images/menu/about-portrait-v1.webp'), '/images/menu/about-portrait-v1.webp');
    assert.equal(getObjectLoop('/images/menu/about-portrait-v1.webp'), null);
    assert.equal(getObjectPosterSrc('/uploads/custom-cover.webp'), '/uploads/custom-cover.webp');
    assert.equal(getObjectLoop('/uploads/custom-cover.webp'), null);
    assert.equal(getObjectLoop('__proto__'), null);
    assert.equal(getObjectLoop(null), null);
    assert.equal(isObjectPosterReady(null, '/uploads/custom-cover.webp'), false);
});
