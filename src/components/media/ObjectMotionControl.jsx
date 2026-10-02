import { useCallback, useSyncExternalStore } from 'react';
import { getObjectLoop } from '../../data/objectLoops';
import { getArtworkMotionSnapshot, objectVideoCache, setArtworkMotionPaused, subscribeArtworkMotion } from '../../utils/objectVideoRuntime';
import './ObjectMotionControl.css';

export default function ObjectMotionControl({ poster, visible = true }) {
    const spec = getObjectLoop(poster);
    const preferences = useSyncExternalStore(subscribeArtworkMotion, getArtworkMotionSnapshot, () => 4);
    const status = useSyncExternalStore(objectVideoCache.subscribe, useCallback(
        () => objectVideoCache.getStatus(spec?.videoSrc), [spec],
    ), () => 'idle');
    if (!spec || !visible || (preferences & 14)) return null;
    const paused = Boolean(preferences & 1);
    const retry = status === 'error';
    const play = paused || retry;
    return (
        <button
            type="button"
            className="object-motion-control"
            aria-label={retry ? 'Retry artwork animation' : play ? 'Play artwork animation' : 'Pause artwork animation'}
            title={retry ? 'Animation unavailable. Try again.' : 'Artwork animation'}
            onClick={() => {
                setArtworkMotionPaused(!play);
                if (retry) objectVideoCache.retry(spec.videoSrc);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onTouchEnd={(event) => event.stopPropagation()}
        >
            <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
                {play ? <path d="M4 2.5 13 8 4 13.5Z" fill="currentColor" /> : <path d="M4 3v10M11 3v10" stroke="currentColor" strokeWidth="2.5" />}
            </svg>
            <span>{play ? 'PLAY' : 'PAUSE'} ANIMATION</span>
        </button>
    );
}
