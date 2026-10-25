import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createMenuSoundEngine } from '../../audio/menuSoundEngine';
import { MENU_SOUND_MANIFEST } from '../../audio/menuSoundManifest';
import { MENU_SOUND_NAVIGATION_EVENT, menuSoundControlState, readMenuSoundPreference, saveMenuSoundPreference } from '../../audio/menuSoundEvents';
import { FILM_TRANSITION_END_EVENT } from '../../utils/filmLeak';
import './MenuSound.css';

const INITIAL_SOUND = Object.freeze({ enabled: false, status: 'off', ready: false, ambientPlaying: false });
const readPage = () => typeof document === 'undefined'
    ? { hidden: true, splash: true, overlay: false }
    : { hidden: document.visibilityState === 'hidden', splash: Boolean(document.getElementById('splash-screen')),
        overlay: Boolean(document.querySelector('.staggered-menu-panel[aria-hidden="false"]')) };

function useSoundPageState() {
    const [page, setPage] = useState(readPage);
    useEffect(() => {
        let leaving = false;
        const sync = () => {
            const next = readPage();
            next.hidden ||= leaving;
            setPage(previous => previous.hidden === next.hidden && previous.splash === next.splash
                && previous.overlay === next.overlay ? previous : next);
        };
        const onHide = () => { leaving = true; sync(); };
        const onShow = () => { leaving = false; sync(); };
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden'] });
        document.addEventListener('visibilitychange', sync);
        window.addEventListener('pagehide', onHide);
        window.addEventListener('pageshow', onShow);
        return () => {
            observer.disconnect();
            document.removeEventListener('visibilitychange', sync);
            window.removeEventListener('pagehide', onHide);
            window.removeEventListener('pageshow', onShow);
        };
    }, []);
    return page;
}

function Speaker({ audible }) {
    return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h4l4-4v14l-4-4H4z" />
        {audible ? <><path d="M16 8a6 6 0 0 1 0 8" /><path d="M19 5a10 10 0 0 1 0 14" /></>
            : <><path d="m16 9 5 6" /><path d="m21 9-5 6" /></>}
    </svg>;
}

export default function MenuSound({ active = false, section = 'music', playerActive = false }) {
    const page = useSoundPageState();
    const engineRef = useRef(null);
    const environmentRef = useRef(null);
    const [sound, setSound] = useState(INITIAL_SOUND);
    const [remembered, setRemembered] = useState(readMenuSoundPreference);
    const statusId = `${useId()}-menu-sound-status`;
    const available = active && !playerActive && !page.hidden && !page.splash && !page.overlay;

    useLayoutEffect(() => {
        environmentRef.current = { menuActive: active && !page.overlay, hidden: page.hidden,
            splash: page.splash, playerActive, section };
        engineRef.current?.setEnvironment(environmentRef.current);
    }, [active, page.hidden, page.overlay, page.splash, playerActive, section]);

    useEffect(() => {
        const engine = createMenuSoundEngine({ manifest: MENU_SOUND_MANIFEST });
        engineRef.current = engine;
        const unsubscribe = engine.subscribe(setSound);
        engine.setEnvironment(environmentRef.current);
        const navigate = event => engine.startNavigation(event.detail);
        const finish = event => engine.endNavigation(event.detail?.id);
        window.addEventListener(MENU_SOUND_NAVIGATION_EVENT, navigate);
        window.addEventListener(FILM_TRANSITION_END_EVENT, finish);
        return () => {
            window.removeEventListener(MENU_SOUND_NAVIGATION_EVENT, navigate);
            window.removeEventListener(FILM_TRANSITION_END_EVENT, finish);
            unsubscribe();
            engine.dispose();
            if (engineRef.current === engine) engineRef.current = null;
        };
    }, []);

    const toggle = () => {
        const engine = engineRef.current;
        if (!engine || !available || sound.status === 'unsupported') return;
        const current = engine.getState();
        if (current.enabled && (current.status === 'on' || current.status === 'loading')) {
            engine.disable();
            setRemembered(false);
            saveMenuSoundPreference(false);
        } else {
            // Keep this synchronous: an awaited import/fetch would lose iOS activation.
            const enabling = engine.enableFromGesture();
            setRemembered(true);
            saveMenuSoundPreference(true);
            enabling.catch(() => {});
        }
    };

    if (!available) return null;
    const control = menuSoundControlState(sound, remembered);
    return <div className="menu-sound-control" data-sound-state={sound.status}>
        <button type="button" className="menu-sound-toggle" onClick={toggle}
            aria-label={control.label} aria-pressed={control.pressed}
            aria-busy={sound.status === 'loading'} aria-disabled={sound.status === 'unsupported'}
            aria-describedby={control.message ? statusId : undefined} title={control.label}>
            <Speaker audible={sound.status === 'on'} />
            <span className="menu-sound-text">{control.text}</span>
        </button>
        <span id={statusId} className="menu-sound-status" role="status" aria-live="polite">{control.message}</span>
    </div>;
}
