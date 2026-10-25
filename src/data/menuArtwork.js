import musicFallback from '../assets/menu-fallback/music.webp?inline';
import mixesFallback from '../assets/menu-fallback/mixes.webp?inline';
import codeFallback from '../assets/menu-fallback/code.webp?inline';
import aboutFallback from '../assets/menu-fallback/about-v1.webp?inline';
import radioModernFallback from '../assets/menu-fallback/radio-modern-v3.webp?inline';
import radioOldschoolFallback from '../assets/menu-fallback/radio-oldschool-v2.webp?inline';
import radioY2kFallback from '../assets/menu-fallback/radio-y2k-v2.webp?inline';

export const MENU_ARTWORK = Object.freeze([
    '/images/menu/music2.webp', '/images/menu/mixes-trans.webp', '/images/menu/code2.webp', '/images/menu/about-portrait-v1.webp',
    '/images/radio/radio-modern-v3.webp',
]);
const fallbacks = Object.freeze({
    [MENU_ARTWORK[0]]: musicFallback,
    [MENU_ARTWORK[1]]: mixesFallback,
    [MENU_ARTWORK[2]]: codeFallback,
    [MENU_ARTWORK[3]]: aboutFallback,
    [MENU_ARTWORK[4]]: radioModernFallback,
    '/images/radio/radio-oldschool-v2.webp': radioOldschoolFallback,
    '/images/radio/radio-y2k-v2.webp': radioY2kFallback,
});
export const getObjectFallbackSrc = (poster) => fallbacks[poster];
