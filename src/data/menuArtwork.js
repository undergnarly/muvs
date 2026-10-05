import musicFallback from '../assets/menu-fallback/music.webp?inline';
import mixesFallback from '../assets/menu-fallback/mixes.webp?inline';
import codeFallback from '../assets/menu-fallback/code.webp?inline';

export const MENU_ARTWORK = Object.freeze([
    '/images/menu/music2.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp',
]);
const fallbacks = Object.freeze({
    [MENU_ARTWORK[0]]: musicFallback,
    [MENU_ARTWORK[1]]: mixesFallback,
    [MENU_ARTWORK[2]]: codeFallback,
});
export const getObjectFallbackSrc = (poster) => fallbacks[poster];
