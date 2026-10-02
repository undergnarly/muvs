// Opt-in sidecars only. Keep CMS coverImage and original posters unchanged.
// Add an entry ONLY after visual/loop/alpha QA and deploying both files:
// '/images/menu/music2.webp': {
//   videoSrc: '/videos/objects/music.mp4',
//   alphaMaskSrc: '/videos/objects/music-alpha.png', width: 720, height: 720,
// }
export const OBJECT_LOOPS = Object.freeze({
    '/images/menu/music2.webp': Object.freeze({
        posterSrc: '/videos/objects/music-v2-poster.webp',
        videoSrc: '/videos/objects/music-v3.mp4', alphaMaskSrc: '/videos/objects/music-alpha.png', width: 720, height: 720,
    }),
    '/images/menu/mixes-trans.webp': Object.freeze({
        videoSrc: '/videos/objects/mixes-v2.mp4', alphaMaskSrc: '/videos/objects/mixes-alpha.png', width: 720, height: 720,
    }),
    '/images/menu/code2.webp': Object.freeze({
        videoSrc: '/videos/objects/code-v2.mp4', alphaMaskSrc: '/videos/objects/code-alpha.png', width: 720, height: 720,
    }),
    '/uploads/1783951707737-ai-agents_trans.webp': Object.freeze({
        videoSrc: '/videos/objects/agents.mp4', alphaMaskSrc: '/videos/objects/agents-alpha.png', width: 720, height: 720,
    }),
});

export const getObjectLoop = (poster) => (
    typeof poster === 'string' && Object.hasOwn(OBJECT_LOOPS, poster)
        ? OBJECT_LOOPS[poster]
        : null
);

export const getObjectPosterSrc = (poster) => getObjectLoop(poster)?.posterSrc || poster;

export function isObjectPosterReady(texture, poster) {
    const source = texture?.image?.currentSrc || texture?.image?.src;
    if (!source || !poster) return false;
    const expected = getObjectPosterSrc(poster);
    try {
        const url = new URL(source, 'https://muvs.invalid');
        return url.pathname === expected || (url.pathname === '/api/image-preview' && url.searchParams.get('src') === expected);
    } catch { return false; }
}
