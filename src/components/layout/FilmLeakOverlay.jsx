import { useEffect, useRef } from 'react';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import { observeDustGestures } from '../../utils/dustWind';
import { consumeFilmTransition, createFilmLeakController, FILM_TRANSITION_EVENT, filmAbortError, filmDeadline, filmLeakSeek, waitForFilmMedia } from '../../utils/filmLeak';
import './FilmLeakOverlay.css';

async function renderedFrame(video, signal, timeout) {
    if (!video.requestVideoFrameCallback) {
        return waitForFilmMedia(video, () => video.readyState >= 2 && !video.paused, ['playing', 'loadeddata'], { signal, timeout });
    }
    let id;
    try {
        await filmDeadline(new Promise(resolve => { id = video.requestVideoFrameCallback(resolve); }), { signal, timeout });
    } catch (error) {
        if (signal.aborted || video.paused || video.readyState < 2) throw error;
        // Some browsers suppress frame callbacks for an opacity-zero video. A
        // resolved native play promise with a current frame is a safe fallback.
    } finally {
        if (id !== undefined) video.cancelVideoFrameCallback?.(id);
    }
}

export default function FilmLeakOverlay({ routeKey, library = false }) {
    const layerRef = useRef(null);
    const videoRef = useRef(null);
    const controllerRef = useRef(null);
    const routeRef = useRef(routeKey);

    useEffect(() => {
        const layer = layerRef.current;
        const video = videoRef.current;
        if (!layer || !video) return undefined;
        let animation;
        let fallbackTimer;
        let source;
        let operation = 0;
        video.muted = video.defaultMuted = true;

        const hide = () => {
            animation?.cancel(); animation = undefined;
            clearTimeout(fallbackTimer); fallbackTimer = undefined;
            layer.classList.remove('is-pulsing');
            layer.style.opacity = '0';
            layer.style.willChange = '';
            delete layer.dataset.active;
            video.pause();
        };
        const setSource = (clip) => {
            if (source === clip) return;
            video.pause();
            source = clip;
            video.preload = 'auto';
            video.src = clip;
            video.dataset.clip = clip;
            video.load();
        };
        const release = () => {
            operation++;
            hide();
            source = undefined;
            video.removeAttribute('src');
            video.preload = 'none';
            delete video.dataset.clip;
            video.load();
        };
        const play = async ({ clip, signal, opacity, duration, random, variant = 'leak' }) => {
            const token = ++operation;
            const current = () => token === operation && !signal.aborted;
            const verify = () => { if (!current()) throw filmAbortError(); };
            const deadline = performance.now() + 1500;
            const remaining = (limit) => {
                verify();
                const left = deadline - performance.now();
                if (left <= 0) throw new Error('Film preparation timed out');
                return Math.min(limit, left);
            };
            const abort = () => { if (token === operation) hide(); };
            signal.addEventListener('abort', abort, { once: true });
            try {
                hide();
                layer.dataset.variant = variant;
                setSource(clip);
                await waitForFilmMedia(video, () => Number.isFinite(video.duration) && video.duration >= duration / 1000 + .05, ['loadedmetadata', 'durationchange'], { signal, timeout: remaining(1000) });
                verify();
                video.currentTime = filmLeakSeek(video.duration, random, duration / 1000);
                await waitForFilmMedia(video, () => !video.seeking && video.readyState >= 2, ['seeked', 'loadeddata', 'canplay'], { signal, timeout: remaining(550) });
                verify();
                await filmDeadline(video.play(), { signal, timeout: remaining(750) });
                verify();
                await renderedFrame(video, signal, remaining(180));
                verify();
                layer.dataset.active = 'true';
                layer.style.setProperty('--film-leak-opacity', opacity);
                layer.style.setProperty('--film-leak-duration', `${duration}ms`);
                layer.style.willChange = 'opacity';
                if (layer.animate) {
                    animation = layer.animate([
                        { opacity: 0, offset: 0, easing: 'ease-out' },
                        { opacity, offset: .1 },
                        { opacity, offset: .75, easing: 'ease-in' },
                        { opacity: 0, offset: 1 },
                    ], { duration, easing: 'linear', fill: 'forwards' });
                    await filmDeadline(animation.finished, { signal, timeout: duration + 200 });
                } else {
                    layer.classList.add('is-pulsing');
                    await filmDeadline(new Promise(resolve => { fallbackTimer = setTimeout(resolve, duration); }), { signal, timeout: duration + 200 });
                }
            } finally {
                signal.removeEventListener('abort', abort);
                if (token === operation) hide();
            }
        };
        const controller = createFilmLeakController({ play, warm: setSource, stop: release });
        controllerRef.current = controller;
        controller.routeChanged(routeRef.current);
        const transition = () => {
            if (consumeFilmTransition()) controller.trigger('transition');
        };
        window.addEventListener(FILM_TRANSITION_EVENT, transition);
        const stopMotion = observeAtmosphereMotion((mode) => {
            layer.dataset.motion = mode;
            controller.setMode(mode);
            // A newly mounted route may subscribe a commit after AppRoot emits.
            // The handoff is consumed once and expires, never a queued flash.
            if (consumeFilmTransition() && mode === 'running') controller.trigger('transition');
        });
        const stopGestures = library ? observeDustGestures((x, y) => controller.gesture(x, y)) : () => {};
        return () => {
            stopGestures(); stopMotion();
            window.removeEventListener(FILM_TRANSITION_EVENT, transition);
            controller.dispose();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [library]);

    useEffect(() => {
        routeRef.current = routeKey;
        controllerRef.current?.routeChanged(routeKey);
    }, [routeKey]);

    return <div ref={layerRef} className={`muvs-film-leak${library ? ' muvs-film-leak--library' : ''}`} data-motion="waiting" aria-hidden="true">
        <video ref={videoRef} muted playsInline disablePictureInPicture controls={false} preload="none" tabIndex={-1} />
    </div>;
}
