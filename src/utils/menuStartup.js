import { MENU_ARTWORK, getObjectFallbackSrc } from '../data/menuArtwork';
import { getObjectLoop, getObjectPosterSrc } from '../data/objectLoops';
import { preloadTexture } from '../hooks/useProgressiveTexture';
import { objectVideoCache } from './objectVideoRuntime';
import { createStartupGate, settleWithin } from './menuStartupGate';

let resolveRendered;
let rendered = false;
let revealed = false;
let progress = 0;
const renderReady = new Promise((resolve) => { resolveRendered = resolve; });

export const markMenuArtworkRendered = () => {
    if (rendered) return;
    rendered = true;
    resolveRendered();
};
export const hasMenuBeenRevealed = () => revealed;
export const markMenuRevealed = () => { revealed = true; };

function updateProgress(value) {
    progress = Math.max(progress, value);
    const bar = document.getElementById('splash-bar');
    if (bar) bar.style.width = `${progress}%`;
}

const startup = createStartupGate({
    waitForRender: () => renderReady,
    prepare: async () => {
        const fallbackReady = Promise.all(MENU_ARTWORK.map((poster) => preloadTexture(getObjectFallbackSrc(poster))));
        const postersReady = Promise.all(MENU_ARTWORK.map((poster) => settleWithin(preloadTexture(getObjectPosterSrc(poster)), 8000)))
            .then(() => updateProgress(65));
        const videosReady = Promise.all(MENU_ARTWORK.map((poster) => objectVideoCache.preload(getObjectLoop(poster))));
        await fallbackReady;
        updateProgress(25);
        await Promise.all([postersReady, settleWithin(videosReady, 8500)]);
        updateProgress(90);
    },
});
export const prepareMenuArtwork = startup.prepare;
export const waitForMenuArtwork = startup.start;
