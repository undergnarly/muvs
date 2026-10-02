// Opt-in sidecars only. Keep CMS coverImage and original posters unchanged.
// Add an entry ONLY after visual/loop/alpha QA and deploying both files:
// '/images/menu/music2.webp': {
//   videoSrc: '/videos/objects/music.mp4',
//   alphaMaskSrc: '/videos/objects/music-alpha.png', width: 720, height: 720,
// }
export const OBJECT_LOOPS = Object.freeze({
    '/images/menu/music2.webp': Object.freeze({
        videoSrc: '/videos/objects/music.mp4', alphaMaskSrc: '/videos/objects/music-alpha.png', width: 720, height: 720,
    }),
    '/images/menu/mixes-trans.webp': Object.freeze({
        videoSrc: '/videos/objects/mixes.mp4', alphaMaskSrc: '/videos/objects/mixes-alpha.png', width: 720, height: 720,
    }),
    '/images/menu/code2.webp': Object.freeze({
        videoSrc: '/videos/objects/code.mp4', alphaMaskSrc: '/videos/objects/code-alpha.png', width: 720, height: 720,
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

export function isObjectPosterReady(texture, poster) {
    const source = texture?.image?.currentSrc || texture?.image?.src;
    if (!source || !poster) return false;
    try {
        const url = new URL(source, 'https://muvs.invalid');
        return url.pathname === poster || (url.pathname === '/api/image-preview' && url.searchParams.get('src') === poster);
    } catch { return false; }
}
