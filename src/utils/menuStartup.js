import { MENU_ARTWORK, getObjectFallbackSrc } from '../data/menuArtwork';
import { getMenuObjectLoops, getObjectPosterSrc } from '../data/objectLoops';
import { preloadTexture } from '../hooks/useProgressiveTexture';
import { objectVideoCache } from './objectVideoRuntime';
import { createStartupGate, settleWithin } from './menuStartupGate';
import { updateSplashProgress } from './splashProgress';
import { prepareMenuDecorationAssets } from './menuDecorations';

let resolveRendered;
let rendered = false;
let revealed = false;
const renderReady = new Promise((resolve) => { resolveRendered = resolve; });

export const markMenuArtworkRendered = () => {
    if (rendered) return;
    rendered = true;
    resolveRendered();
};
export const hasMenuBeenRevealed = () => revealed;
export const markMenuRevealed = () => { revealed = true; };

const startup = createStartupGate({
    waitForRender: () => Promise.all([renderReady, prepareMenuDecorationAssets(preloadTexture)]),
    prepare: async () => {
        const decorationReady = prepareMenuDecorationAssets(preloadTexture);
        const fallbackReady = Promise.all(MENU_ARTWORK.map((poster) => preloadTexture(getObjectFallbackSrc(poster))));
        const postersReady = Promise.all(MENU_ARTWORK.map((poster) => settleWithin(preloadTexture(getObjectPosterSrc(poster)), 8000)))
            .then(() => updateSplashProgress(65));
        const videosReady = Promise.all(getMenuObjectLoops(MENU_ARTWORK).map((spec) => objectVideoCache.preload(spec)));
        await fallbackReady;
        updateSplashProgress(25);
        await Promise.all([postersReady, settleWithin(videosReady, 8500), decorationReady]);
        updateSplashProgress(90);
    },
});
export const prepareMenuArtwork = startup.prepare;
export const waitForMenuArtwork = startup.start;
