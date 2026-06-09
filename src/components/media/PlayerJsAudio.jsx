import React, { useEffect, useRef } from 'react';
import './PlayerJsAudio.css';

// ---- one-time global loader for /playerjs.js (public/) ----
let playerjsPromise = null;
const loadPlayerjs = () => {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.Playerjs) return Promise.resolve();
    if (playerjsPromise) return playerjsPromise;
    playerjsPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '/playerjs.js';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => { playerjsPromise = null; reject(new Error('playerjs failed to load')); };
        document.head.appendChild(s);
    });
    return playerjsPromise;
};

// unique container id per mounted instance (Player JS needs an element id)
let uid = 0;

const getTrackUrl = (t) => t?.audioFile || t?.audioUrl || t?.audio || t?.url || '';
const getTrackTitle = (t, i) => t?.title || `TRACK ${String(i + 1).padStart(2, '0')}`;

const PlayerJsAudio = ({ release }) => {
    const holderRef = useRef(null);
    const instanceRef = useRef(null);
    const idRef = useRef(`pjs-player-${++uid}`);

    const releaseId = release?.id ?? release?.title ?? '';

    useEffect(() => {
        let cancelled = false;
        const tracks = release?.tracks?.length ? release.tracks : [];
        const cover = release?.coverImage || release?.cover || '';

        const playlist = tracks
            .map((t, i) => ({ t, i, url: getTrackUrl(t) }))
            .filter((x) => x.url)
            .map((x) => ({
                title: `${x.t.artist || release?.artists || ''} — ${getTrackTitle(x.t, x.i)}`
                    .replace(/^—\s*/, '')
                    .trim(),
                file: x.url,
                poster: cover,
            }));

        const destroy = () => {
            const inst = instanceRef.current;
            if (inst && typeof inst.api === 'function') {
                try { inst.api('destroy'); } catch { /* ignore */ }
            }
            instanceRef.current = null;
            if (holderRef.current) holderRef.current.innerHTML = '';
        };

        if (!playlist.length) {
            destroy();
            return () => { cancelled = true; };
        }

        loadPlayerjs()
            .then(() => {
                if (cancelled || !holderRef.current || !window.Playerjs) return;
                destroy();
                // Player JS replaces the target element, so give it a fresh child div.
                const inner = document.createElement('div');
                inner.id = idRef.current;
                holderRef.current.appendChild(inner);

                instanceRef.current = new window.Playerjs({
                    id: idRef.current,
                    // single track -> plain url; multiple -> JSON playlist
                    file: playlist.length === 1 ? playlist[0].file : JSON.stringify(playlist),
                    poster: cover,
                    autoplay: 0,
                    preload: 'metadata',
                    // site accent (salad-green) for seek fill, handle, hover, points
                    color: '#ccff00',
                    handlecolor: '#ccff00',
                    colorover: '#ccff00',
                    pointcolor: '#ccff00',
                });
            })
            .catch(() => { /* network/load error — keep slot empty */ });

        return () => {
            cancelled = true;
            destroy();
        };
        // re-init when the release (and thus its tracks) changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [releaseId]);

    return <div className="hn-playerjs" ref={holderRef} aria-label="Audio player" />;
};

export default PlayerJsAudio;
