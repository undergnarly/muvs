import { useEffect, useMemo, useRef } from 'react';
import { observeAtmosphereMotion } from '../../utils/atmosphere';
import { observeDustGestures } from '../../utils/dustWind';
import { createFilmLeakController, FILM_LEAK_CLIPS, FILM_TRANSITION_EVENT, FILM_TRANSITION_END_EVENT, takeFilmTransition, filmAbortError, filmDeadline, filmLeakPlaybackPlan, waitForFilmMedia } from '../../utils/filmLeak';
import { normalizeVisualEffects } from '../../utils/visualEffects';
import { FILM_LEAK_POSTERS } from '../../data/filmLeakPosters';
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

export default function FilmLeakOverlay({ routeKey, library = false, settings }) {
    const layerRef = useRef(null);
    const videoRef = useRef(null);
    const controllerRef = useRef(null);
    const routeRef = useRef(routeKey);
    const normalized = normalizeVisualEffects(settings);
    const settingsKey = JSON.stringify({
        transition: normalized.transition, lightLeaks: normalized.lightLeaks, filmDust: normalized.filmDust,
    });
    // Handheld-only edits or equivalent raw objects must not restart a held
    // film operation. Actual film changes dispose the old decoder/timers.
    const filmSettings = useMemo(() => JSON.parse(settingsKey), [settingsKey]);

    useEffect(() => {
        const layer = layerRef.current;
        const video = videoRef.current;
        if (!layer || !video) return undefined;
        let animation;
        let fallbackTimer;
        let source;
        let operation = 0;
        let warmAbort;
        let posterImages = [];
        video.muted = video.defaultMuted = true;

        const hide = () => {
            animation?.cancel(); animation = undefined;
            clearTimeout(fallbackTimer); fallbackTimer = undefined;
            layer.classList.remove('is-pulsing');
            layer.style.opacity = '0';
            layer.style.willChange = '';
            delete layer.dataset.active;
            delete layer.dataset.managed;
            layer.style.removeProperty('--film-leak-poster');
            layer.style.transition = '';
            video.style.opacity = '0';
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
            warmAbort?.abort(); warmAbort = undefined;
            posterImages = [];
            hide();
            source = undefined;
            video.removeAttribute('src');
            video.preload = 'none';
            delete video.dataset.clip;
            video.load();
        };
        const warm = (clip) => {
            setSource(clip);
            if (!filmSettings.transition.enabled || filmSettings.transition.opacity <= 0) return;
            if (warmAbort) return;
            warmAbort = new AbortController();
            if (!posterImages.length) posterImages = Object.values(FILM_LEAK_POSTERS).map(src => {
                const image = new Image(); image.src = src; image.decode?.().catch(() => {}); return image;
            });
            for (const src of FILM_LEAK_CLIPS) fetch(src, { cache: 'force-cache', signal: warmAbort.signal }).then(response => response.arrayBuffer()).catch(() => {});
        };
        const play = async ({ clip, signal, opacity, duration, random, variant = 'leak', kind, managed = false, ended, motionSignal, fadeOutMs = 100 }) => {
            const token = ++operation;
            const current = () => token === operation && !signal.aborted;
            const verify = () => { if (!current()) throw filmAbortError(); };
            const navigation = managed || kind === 'transition' || kind === 'gesture';
            if (managed && motionSignal?.aborted) return;
            const prepareAbort = new AbortController();
            const stopPreparing = () => prepareAbort.abort();
            signal.addEventListener('abort', stopPreparing, { once: true });
            motionSignal?.addEventListener('abort', stopPreparing, { once: true });
            const mediaSignal = prepareAbort.signal;
            const deadline = performance.now() + (navigation ? 500 : 1500);
            const remaining = (limit) => {
                verify();
                if (mediaSignal.aborted) throw filmAbortError();
                const left = deadline - performance.now();
                if (left <= 0) throw new Error('Film preparation timed out');
                return Math.min(limit, left);
            };
            const abort = () => { if (token === operation) hide(); };
            signal.addEventListener('abort', abort, { once: true });
            const prepare = async () => {
                setSource(clip);
                await waitForFilmMedia(video, () => Number.isFinite(video.duration) && video.duration > 0, ['loadedmetadata', 'durationchange'], { signal: mediaSignal, timeout: remaining(1000) });
                verify();
                const playback = filmLeakPlaybackPlan(video.duration, { duration, navigation, random });
                video.loop = playback.loop;
                video.currentTime = playback.time;
                await waitForFilmMedia(video, () => !video.seeking && video.readyState >= 2, ['seeked', 'loadeddata', 'canplay'], { signal: mediaSignal, timeout: remaining(550) });
                verify();
                const playing = video.play();
                Promise.resolve(playing).then(() => { if (token === operation && mediaSignal.aborted) video.pause(); }).catch(() => {});
                await filmDeadline(playing, { signal: mediaSignal, timeout: remaining(750) });
                await renderedFrame(video, mediaSignal, remaining(navigation ? 60 : 180));
                remaining(1);
                video.style.opacity = '1';
            };
            try {
                hide();
                layer.dataset.variant = variant;
                if (navigation) {
                    layer.dataset.managed = 'true';
                    const poster = FILM_LEAK_POSTERS[clip];
                    if (poster) layer.style.setProperty('--film-leak-poster', `url("${poster}")`);
                    layer.dataset.active = 'true';
                    layer.style.willChange = 'opacity';
                    layer.style.opacity = String(opacity);
                    const preparation = prepare().catch(() => {
                        stopPreparing();
                        if (current()) { video.pause(); video.style.opacity = '0'; }
                    });
                    const fadeDuration = managed ? fadeOutMs : Math.min(fadeOutMs, duration);
                    const finish = managed ? ended : new Promise(resolve => { fallbackTimer = setTimeout(resolve, Math.max(0, duration - fadeDuration)); });
                    if (managed) await finish;
                    else await filmDeadline(finish, { signal, timeout: duration + 100 });
                    stopPreparing();
                    verify();
                    if (fadeDuration <= 0) {
                        layer.style.opacity = '0';
                    } else if (layer.animate) {
                        const from = Number(getComputedStyle(layer).opacity);
                        animation = layer.animate([{ opacity: from }, { opacity: 0 }], { duration: fadeDuration, easing: 'ease-in', fill: 'forwards' });
                        await filmDeadline(animation.finished, { signal, timeout: fadeDuration + 200 });
                    } else {
                        layer.style.transition = `opacity ${fadeDuration}ms ease-in`;
                        layer.style.opacity = '0';
                        await filmDeadline(new Promise(resolve => { fallbackTimer = setTimeout(resolve, fadeDuration); }), { signal, timeout: fadeDuration + 200 });
                    }
                    await preparation;
                    return;
                }
                await prepare();
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
                stopPreparing();
                signal.removeEventListener('abort', stopPreparing);
                motionSignal?.removeEventListener('abort', stopPreparing);
                signal.removeEventListener('abort', abort);
                if (token === operation) hide();
            }
        };
        const controller = createFilmLeakController({ play, warm, stop: release, settings: filmSettings });
        controllerRef.current = controller;
        controller.routeChanged(routeRef.current);
        const accept = record => {
            if (!record) return;
            if (record.detail?.managed) controller.beginTransition(record.detail);
            else controller.trigger('transition');
        };
        const transition = () => accept(takeFilmTransition());
        const endTransition = event => controller.endTransition(event.detail?.id);
        window.addEventListener(FILM_TRANSITION_EVENT, transition);
        window.addEventListener(FILM_TRANSITION_END_EVENT, endTransition);
        const stopMotion = observeAtmosphereMotion((mode) => {
            layer.dataset.motion = mode;
            controller.setMode(mode);
            // A newly mounted route may subscribe a commit after AppRoot emits.
            // The handoff is consumed once and expires, never a queued flash.
            const pending = takeFilmTransition();
            if (mode === 'running') accept(pending);
        });
        const stopGestures = library ? observeDustGestures((x, y) => controller.gesture(x, y)) : () => {};
        return () => {
            stopGestures(); stopMotion();
            window.removeEventListener(FILM_TRANSITION_EVENT, transition);
            window.removeEventListener(FILM_TRANSITION_END_EVENT, endTransition);
            controller.dispose();
            if (controllerRef.current === controller) controllerRef.current = null;
        };
    }, [library, filmSettings]);

    useEffect(() => {
        routeRef.current = routeKey;
        controllerRef.current?.routeChanged(routeKey);
    }, [routeKey]);

    return <div ref={layerRef} className={`muvs-film-leak${library ? ' muvs-film-leak--library' : ''}`} data-motion="waiting" aria-hidden="true">
        <video ref={videoRef} muted playsInline disablePictureInPicture controls={false} preload="none" tabIndex={-1} />
    </div>;
}
