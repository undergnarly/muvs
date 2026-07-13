import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AlbumPlayer.css';

const getTrackUrl = (t) => t?.audioFile || t?.audioUrl || t?.audio || t?.url || '';
const getTrackTitle = (t, i) => t?.title || `TRACK ${String(i + 1).padStart(2, '0')}`;

const fmt = (s) => {
    if (!isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};

const PlayIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5 L19 12 L8 19 Z" fill="currentColor" /></svg>
);
const PauseIcon = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" /></svg>
);
const PrevIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 6 V18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M18 6 L9 12 L18 18 Z" fill="currentColor" /></svg>
);
const NextIcon = () => (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M17 6 V18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M6 6 L15 12 L6 18 Z" fill="currentColor" /></svg>
);
const VolIcon = ({ muted }) => (
    muted ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9 H7 L11 5 V19 L7 15 H4 Z" fill="currentColor" /><path d="M15 9 L20 15 M20 9 L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9 H7 L11 5 V19 L7 15 H4 Z" fill="currentColor" /><path d="M14.5 8.5 A5 5 0 0 1 14.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /><path d="M17 6 A8.5 8.5 0 0 1 17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
    )
);
const CollapseIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M7 10 L12 15 L17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);
const ExpandIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M7 14 L12 9 L17 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
);
const BurgerIcon = () => (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

const AlbumPlayer = ({ release, releases = [], currentReleaseIndex = 0, onReleaseSelect, compact = false }) => {
    const audioRef = useRef(null);
    const playOnLoadRef = useRef(false);

    const tracks = release?.tracks || [];
    const cover = release?.coverImage || release?.cover || '';
    const releaseId = release?.id ?? release?.title ?? '';

    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);
    const [collapseOverride, setCollapseOverride] = useState({ mode: compact, value: compact });
    const [showReleases, setShowReleases] = useState(false);
    const collapsed = collapseOverride.mode === compact ? collapseOverride.value : compact;

    const count = tracks.length;
    const track = count ? tracks[Math.min(index, count - 1)] : null;
    const url = getTrackUrl(track);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const a = new Audio();
        a.preload = 'metadata';
        audioRef.current = a;
        return () => { try { a.pause(); a.src = ''; } catch { /* ignore */ } };
    }, []);

    useEffect(() => {
        playOnLoadRef.current = false;
        setIndex(0);
        setPlaying(false);
        setProgress(0);
        setCurrent(0);
        setDuration(0);
        setShowReleases(false);
    }, [releaseId]);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return undefined;
        const onTime = () => {
            setCurrent(a.currentTime);
            setProgress(a.duration > 0 ? a.currentTime / a.duration : 0);
        };
        const onMeta = () => setDuration(a.duration || 0);
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onEnd = () => {
            if (count > 1) { playOnLoadRef.current = true; setIndex((i) => (i + 1) % count); }
            else { setPlaying(false); }
        };
        a.addEventListener('timeupdate', onTime);
        a.addEventListener('loadedmetadata', onMeta);
        a.addEventListener('play', onPlay);
        a.addEventListener('pause', onPause);
        a.addEventListener('ended', onEnd);
        return () => {
            a.removeEventListener('timeupdate', onTime);
            a.removeEventListener('loadedmetadata', onMeta);
            a.removeEventListener('play', onPlay);
            a.removeEventListener('pause', onPause);
            a.removeEventListener('ended', onEnd);
        };
    }, [count]);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        setProgress(0);
        setCurrent(0);
        setDuration(0);
        if (!url) { try { a.pause(); a.removeAttribute('src'); a.load(); } catch { /* ignore */ } return; }
        try {
            a.src = url;
            a.load();
            if (playOnLoadRef.current) {
                playOnLoadRef.current = false;
                a.play().catch(() => setPlaying(false));
            }
        } catch { /* ignore */ }
    }, [url]);

    const toggle = useCallback(() => {
        const a = audioRef.current;
        if (!a || !url) return;
        if (a.paused) a.play().catch(() => setPlaying(false));
        else a.pause();
    }, [url]);

    const next = useCallback(() => {
        if (count < 2) return;
        playOnLoadRef.current = !audioRef.current?.paused;
        setIndex((i) => (i + 1) % count);
    }, [count]);

    const prev = useCallback(() => {
        if (count < 2) return;
        playOnLoadRef.current = !audioRef.current?.paused;
        setIndex((i) => (i - 1 + count) % count);
    }, [count]);

    const playIndex = useCallback((i) => {
        if (i === index) { toggle(); return; }
        playOnLoadRef.current = true;
        setIndex(i);
    }, [index, toggle]);

    const seek = useCallback((e) => {
        const a = audioRef.current;
        if (!a || !a.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        a.currentTime = rel * a.duration;
        setProgress(rel);
    }, []);

    const toggleMute = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        a.muted = !a.muted;
        setMuted(a.muted);
    }, []);

    const toggleCollapsed = useCallback(() => {
        if (!collapsed) setShowReleases(false);
        setCollapseOverride({ mode: compact, value: !collapsed });
    }, [collapsed, compact]);

    const toggleBurger = useCallback(() => {
        setShowReleases(r => !r);
    }, []);

    if (!count) return null;

    const liveTitle = `${track?.artist || release?.artists || ''} — ${getTrackTitle(track, index)}`
        .replace(/^—\s*/, '').trim();

    const hasBurger = releases.length > 1;

    const seekBar = (
        <div
            className="ap-seek"
            role="slider"
            aria-label="Track position"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            onClick={seek}
        >
            <div className="ap-seek-track">
                <div className="ap-seek-fill" style={{ width: `${progress * 100}%` }} />
                <div className="ap-seek-handle" style={{ left: `${progress * 100}%` }} />
            </div>
        </div>
    );

    const controls = (
        <div className="ap-controls">
            <button className="ap-btn ap-play" onClick={toggle} disabled={!url} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="ap-btn" onClick={prev} disabled={count < 2} aria-label="Previous track"><PrevIcon /></button>
            <button className="ap-btn" onClick={next} disabled={count < 2} aria-label="Next track"><NextIcon /></button>
            <button className="ap-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}><VolIcon muted={muted} /></button>
            <span className="ap-time">{fmt(current)} / {fmt(duration)}</span>
            {hasBurger && (
                <button
                    className={`ap-btn ap-btn--sm${showReleases ? ' ap-btn--active' : ''}`}
                    onClick={toggleBurger}
                    aria-label="Browse releases"
                >
                    <BurgerIcon />
                </button>
            )}
            <button className="ap-btn ap-btn--sm" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand player' : 'Collapse player'}>
                {collapsed ? <ExpandIcon /> : <CollapseIcon />}
            </button>
        </div>
    );

    return (
        <div className={`ap${collapsed ? ' ap--collapsed' : ''}`}>
            <div className="ap-expandable" aria-hidden={collapsed}>
                <div className="ap-expandable-inner">
                    <div className="ap-top">
                        {cover && !showReleases && (
                            <div className="ap-cover">
                                <img src={cover} alt="" loading="lazy" decoding="async" />
                            </div>
                        )}
                        {showReleases ? (
                            <ul className="ap-list" role="listbox" aria-label="Releases">
                                {releases.map((r, i) => (
                                    <li
                                        key={r.id || i}
                                        className={`ap-row${i === currentReleaseIndex ? ' active' : ''}`}
                                        onClick={() => { onReleaseSelect?.(i); setShowReleases(false); }}
                                        role="option"
                                        aria-selected={i === currentReleaseIndex}
                                    >
                                        <span className="ap-row-title">
                                            {[r.artists, r.title].filter(Boolean).join(' — ')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <ul className="ap-list" role="listbox" aria-label={liveTitle}>
                                {tracks.map((t, i) => {
                                    const active = i === index;
                                    return (
                                        <li
                                            key={t.id || i}
                                            className={`ap-row${active ? ' active' : ''}`}
                                            onClick={() => playIndex(i)}
                                            role="option"
                                            aria-selected={active}
                                        >
                                            <span className="ap-row-title">
                                                {`${t.artist || release?.artists || ''} — ${getTrackTitle(t, i)}`.replace(/^—\s*/, '').trim()}
                                            </span>
                                            {active && playing && (
                                                <span className="ap-eq" aria-hidden="true"><i /><i /><i /></span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <div className="ap-mini-wrap" aria-hidden={!collapsed}>
                <div className="ap-mini-row">
                    <span className="ap-mini-title">{liveTitle}</span>
                </div>
            </div>
            {seekBar}
            {controls}
        </div>
    );
};

export default AlbumPlayer;
