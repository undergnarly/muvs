import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Disc3, Headphones, LoaderCircle, Pause, Play, Search, SkipBack, SkipForward, SlidersHorizontal, Volume2, X } from 'lucide-react';
import { INITIAL_FILTERS, filterTracks, formatTime, waveformBars } from '../../utils/dubplates';
import './DubplatesPage.css';

const Icon = ({ playing, size = 18 }) => playing ? <Pause size={size} fill="currentColor" /> : <Play size={size} fill="currentColor" />;

function Cover({ track, small = false }) {
    return <div className={`dp-cover${small ? ' dp-cover-small' : ''}`}>
        {track?.coverImage ? <img key={track.coverImage} src={track.coverImage} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
        <Disc3 aria-hidden="true" />
    </div>;
}

function Waveform({ track, position, active, onSeek }) {
    const bars = useMemo(() => waveformBars(track.peaks), [track.peaks]);
    const duration = track.duration || 0;
    const progress = duration ? position / duration : 0;
    return <div className={`dp-waveform${active ? ' is-active' : ''}`}>
        {bars.length ? <svg viewBox={`0 0 ${bars.length * 4} 48`} preserveAspectRatio="none" aria-hidden="true">
            {bars.map((peak, index) => <rect key={index} x={index * 4} y={24 - Math.max(2, peak * 44) / 2} width="2.5" height={Math.max(2, peak * 44)} rx="1" className={active && index / bars.length < progress ? 'is-played' : ''} />)}
        </svg> : <span className="dp-waveform-unavailable">Seek through track</span>}
        <input type="range" min="0" max={duration || 1} step="0.1" value={active ? Math.min(position, duration) : 0} disabled={!duration} aria-label={`Seek ${track.title}`} aria-valuetext={`${formatTime(active ? position : 0)} of ${formatTime(duration)}`} onChange={(event) => onSeek(track, Number(event.target.value))} />
    </div>;
}

function ExportDialog({ tracks, onClose }) {
    const dialogRef = useRef(null);
    const [format, setFormat] = useState('mp3');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [downloadUrl, setDownloadUrl] = useState('');
    const wavCount = tracks.filter((track) => track.formats.includes('wav')).length;
    const mp3Count = tracks.filter((track) => track.formats.includes('mp3')).length;
    useEffect(() => {
        const dialog = dialogRef.current;
        dialog.showModal();
        return () => dialog.close();
    }, []);

    const download = async () => {
        setBusy(true);
        setError('');
        setDownloadUrl('');
        try {
            const response = await fetch('/api/dubplates/exports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: tracks.map((track) => track.id), format }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not prepare your download. Try again.');
            if (!/^\/api\/dubplates\/exports\/[a-zA-Z0-9_-]+$/.test(result.downloadUrl)) throw new Error('Download link is unavailable. Try again.');
            setDownloadUrl(result.downloadUrl);
            const link = document.createElement('a');
            link.href = result.downloadUrl;
            link.download = `MUVS-Dubplates-${format.toUpperCase()}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (failure) {
            setError(failure.message || 'Download unavailable. Check your connection and try again.');
        } finally { setBusy(false); }
    };

    return <dialog className="dp-export-dialog" ref={dialogRef} aria-labelledby="dp-export-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onClick={(event) => { if (event.target === dialogRef.current && !busy) onClose(); }}>
        <div className="dp-export-heading"><h2 id="dp-export-title">Take your picks.</h2><button className="dp-icon-button" onClick={onClose} disabled={busy} aria-label="Close export"><X size={22} /></button></div>
        <p>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} in one ZIP. Choose your format.</p>
        <fieldset className="dp-format-options"><legend className="dp-sr-only">Download format</legend>
            {[{ value: 'mp3', title: 'MP3', detail: 'Compact files. Ready to listen.', available: mp3Count === tracks.length }, { value: 'wav', title: 'WAV', detail: 'Original lossless masters.', available: wavCount === tracks.length }].map((option) => <label key={option.value} className={`${format === option.value ? 'is-selected' : ''} ${!option.available ? 'is-unavailable' : ''}`}>
                <input type="radio" name="export-format" value={option.value} checked={format === option.value} disabled={!option.available || busy} onChange={() => { setFormat(option.value); setDownloadUrl(''); setError(''); }} /><span><strong>{option.title}</strong><small>{option.detail}</small></span>
            </label>)}
        </fieldset>
        {wavCount < tracks.length && <p className="dp-format-note">{tracks.length - wavCount} selected {tracks.length - wavCount === 1 ? 'track has' : 'tracks have'} no WAV master. Choose MP3, or change your selection.</p>}
        <div className="dp-export-tracklist">{tracks.map((track) => <div key={track.id}><span>{track.title}</span><small>{track.artist}</small></div>)}</div>
        {error && <p role="alert" className="dp-error">{error}</p>}
        {downloadUrl && <p role="status" className="dp-download-status">Download requested. Check your browser’s downloads. If it didn’t start, prepare a new download below.</p>}
        <button className="dp-primary dp-download-button" onClick={download} disabled={busy || (format === 'wav' ? wavCount : mp3Count) !== tracks.length}>{busy ? <LoaderCircle className="dp-spin" size={18} /> : <ArrowDownToLine size={18} />}{busy ? 'Preparing download…' : downloadUrl ? 'Prepare another download' : `Download ${format.toUpperCase()} ZIP`}</button>
        <p className="dp-export-footnote">For your ears and your sets. Please keep the link close.</p>
    </dialog>;
}

export default function DubplatesPage() {
    const [tracks, setTracks] = useState([]);
    const [status, setStatus] = useState('loading');
    const [loadVersion, setLoadVersion] = useState(0);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [currentId, setCurrentId] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [buffering, setBuffering] = useState(false);
    const [position, setPosition] = useState(0);
    const [volume, setVolume] = useState(1);
    const [message, setMessage] = useState('');
    const [exportOpen, setExportOpen] = useState(false);
    const audioRef = useRef(null);
    const pendingSeek = useRef(0);
    const [queueIds, setQueueIds] = useState([]);
    const playRequest = useRef(0);
    const current = tracks.find((track) => track.id === currentId);
    const filtered = useMemo(() => filterTracks(tracks, filters), [tracks, filters]);
    const selectedTracks = tracks.filter((track) => selected.has(track.id));
    const hiddenSelected = selectedTracks.filter((track) => !filtered.some((item) => item.id === track.id)).length;
    const hasFilters = Object.keys(INITIAL_FILTERS).some((key) => key !== 'sort' && filters[key] !== INITIAL_FILTERS[key]);
    const filterCount = ['type', 'genre', 'release', 'bpmMin', 'bpmMax'].filter((key) => filters[key] !== '').length;
    const genres = useMemo(() => [...new Set(tracks.map((track) => track.genre).filter(Boolean))].sort(), [tracks]);
    const releases = useMemo(() => [...new Set(tracks.map((track) => track.releaseTitle).filter(Boolean))].sort(), [tracks]);
    const allVisibleSelected = filtered.length > 0 && filtered.every((track) => selected.has(track.id));

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Dubplates — MUVS';
        const robots = document.createElement('meta');
        robots.name = 'robots'; robots.content = 'noindex, nofollow, noarchive';
        document.head.appendChild(robots);
        const referrer = document.createElement('meta');
        referrer.name = 'referrer'; referrer.content = 'no-referrer';
        document.head.appendChild(referrer);
        const splash = document.getElementById('splash-screen');
        if (splash) splash.remove();
        return () => { document.title = previousTitle; robots.remove(); referrer.remove(); };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/dubplates', { signal: controller.signal, cache: 'no-store' })
            .then(async (response) => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
            .then((result) => { setTracks(Array.isArray(result.tracks) ? result.tracks : []); setStatus('ready'); })
            .catch((error) => { if (error.name !== 'AbortError') setStatus('error'); });
        return () => controller.abort();
    }, [loadVersion]);

    const updateFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));
    const playTrack = async (track, seekTo = null, queue = null) => {
        const audio = audioRef.current;
        if (!audio || !track) return;
        const request = ++playRequest.current;
        setMessage('');
        if (currentId !== track.id) {
            audio.pause();
            setCurrentId(track.id);
            setPosition(seekTo || 0);
            pendingSeek.current = seekTo || 0;
            audio.src = track.previewUrl;
            audio.load();
            setQueueIds(queue || filtered.map((item) => item.id));
        } else if (seekTo != null) {
            if (audio.readyState) audio.currentTime = seekTo;
            else pendingSeek.current = seekTo;
            setPosition(seekTo);
        } else if (!audio.paused) { audio.pause(); return; }
        setBuffering(true);
        try { await audio.play(); }
        catch (error) {
            if (request === playRequest.current && error.name !== 'AbortError') { setMessage('Could not play this track. Press play to retry.'); setPlaying(false); setBuffering(false); }
        }
    };

    const stepTrack = (direction) => {
        const queue = queueIds;
        const index = queue.indexOf(currentId);
        const next = tracks.find((track) => track.id === queue[index + direction]);
        if (next) playTrack(next, 0, queue);
        else { setPlaying(false); setBuffering(false); }
    };

    const toggleSelected = (id) => {
        if (!selected.has(id) && selected.size >= 50) { setMessage('You can export up to 50 tracks at once. Download these picks first.'); return; }
        setSelected((previous) => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };
    const toggleAll = () => {
        if (!allVisibleSelected && new Set([...selected, ...filtered.map((track) => track.id)]).size > 50) { setMessage('Choose up to 50 tracks for one export.'); return; }
        setSelected((previous) => { const next = new Set(previous); filtered.forEach(({ id }) => { if (allVisibleSelected) next.delete(id); else next.add(id); }); return next; });
    };

    return <div className="dp-page">
        <header className="dp-header dp-container"><a className="dp-logo" href="/" aria-label="MUVS official website"><span /></a><a className="dp-site-link" href="/">Official website <ArrowUpRight size={16} /></a></header>
        <main>
            <section className="dp-intro dp-container"><div><h1>Dubplates<span>.</span></h1><p>A few tracks, passed between friends.</p></div><span className="dp-library-count"><Headphones size={17} />{status === 'ready' ? `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} to dig into` : 'The listening room'}</span></section>
            <section className="dp-toolbar" aria-label="Find tracks"><div className="dp-container">
                <div className="dp-toolbar-main"><label className="dp-search"><Search size={19} /><span className="dp-sr-only">Search tracks</span><input type="search" placeholder="Search tracks, artists, releases…" value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} /></label>
                    <button className={`dp-filter-toggle${filtersOpen ? ' is-open' : ''}`} aria-expanded={filtersOpen} aria-controls="dp-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={17} />Filters{filterCount > 0 && <span>{filterCount}</span>}</button>
                    <label className="dp-sort"><span className="dp-sr-only">Sort tracks</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="bpm-asc">BPM low to high</option><option value="bpm-desc">BPM high to low</option></select><ChevronDown size={14} /></label>
                </div>
                <div className={`dp-filters${filtersOpen ? ' is-open' : ''}`} id="dp-filters">
                    <label><span>Type</span><select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}><option value="">All tracks</option><option value="dubplate">Dubplates</option><option value="release">Releases</option></select></label>
                    <label><span>Genre</span><select value={filters.genre} onChange={(event) => updateFilter('genre', event.target.value)}><option value="">All genres</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></label>
                    <label className="dp-release-filter"><span>EP / release</span><select value={filters.release} onChange={(event) => updateFilter('release', event.target.value)}><option value="">All releases</option>{releases.map((release) => <option key={release}>{release}</option>)}</select></label>
                    <fieldset className="dp-bpm"><legend>BPM</legend><input aria-label="Minimum BPM" type="number" min="20" max="400" placeholder="From" value={filters.bpmMin} onChange={(event) => updateFilter('bpmMin', event.target.value)} /><span>–</span><input aria-label="Maximum BPM" type="number" min="20" max="400" placeholder="To" value={filters.bpmMax} onChange={(event) => updateFilter('bpmMax', event.target.value)} /></fieldset>
                    {hasFilters && <button className="dp-clear-filters" onClick={() => setFilters({ ...INITIAL_FILTERS, sort: filters.sort })}><X size={14} />Reset</button>}
                </div>
            </div></section>
            <section className="dp-library dp-container" aria-label="Track library" aria-busy={status === 'loading'}>
                <div className="dp-list-heading"><div><label className="dp-select-all"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={!filtered.length} /><span>{allVisibleSelected ? 'Deselect visible' : 'Select visible'}</span></label><span className="dp-result-count" role="status">{status === 'ready' ? `${filtered.length} ${filtered.length === 1 ? 'track' : 'tracks'}` : ''}</span></div>{selected.size > 0 && <button className="dp-clear-selection" onClick={() => setSelected(new Set())}>Clear {selected.size} selected{hiddenSelected ? ` (${hiddenSelected} hidden)` : ''}</button>}</div>
                {status === 'loading' && <div className="dp-empty" role="status"><LoaderCircle className="dp-spin" size={28} /><h2>Opening the crate…</h2></div>}
                {status === 'error' && <div className="dp-empty" role="alert"><Disc3 size={36} /><h2>The crate couldn’t load.</h2><p>Check your connection, then give it another try.</p><button className="dp-secondary" onClick={() => { setStatus('loading'); setLoadVersion((value) => value + 1); }}>Try again</button></div>}
                {status === 'ready' && !tracks.length && <div className="dp-empty"><Disc3 size={44} strokeWidth={1} /><h2>Fresh cuts are on their way.</h2><p>Nothing in the crate just yet. Come back for the next drop.</p></div>}
                {status === 'ready' && !!tracks.length && !filtered.length && <div className="dp-empty"><Search size={30} /><h2>No tracks in this groove.</h2><p>Try a different title or open up your filters.</p><button className="dp-secondary" onClick={() => setFilters(INITIAL_FILTERS)}>Clear filters</button></div>}
                <div className="dp-track-list">{filtered.map((track) => {
                    const active = track.id === currentId;
                    return <article key={track.id} className={`dp-track${active ? ' is-active' : ''}${selected.has(track.id) ? ' is-selected' : ''}`}>
                        <label className="dp-track-check"><input type="checkbox" checked={selected.has(track.id)} onChange={() => toggleSelected(track.id)} aria-label={`Select ${track.title}`} /><span><Check size={13} strokeWidth={3} /></span></label>
                        <button className="dp-cover-play" onClick={() => playTrack(track)} aria-label={`${active && playing ? 'Pause' : 'Play'} ${track.title}`}><Cover track={track} /><span className="dp-cover-play-icon">{active && buffering ? <LoaderCircle size={20} className="dp-spin" /> : <Icon playing={active && playing} />}</span></button>
                        <div className="dp-track-info"><div className="dp-track-title"><h2>{track.title}</h2>{track.type === 'dubplate' && <span className="dp-type">Dubplate</span>}</div><p className="dp-artist">{track.artist || 'MUVS'}</p><div className="dp-track-tags">{track.genre && <span>{track.genre}</span>}{track.releaseTitle && <span>{track.releaseTitle}</span>}{track.musicalKey && <span>{track.musicalKey}</span>}</div>{track.notes && <details className="dp-track-notes"><summary>Track notes</summary><p>{track.notes}</p></details>}</div>
                        <div className="dp-track-wave"><Waveform track={track} position={active ? position : 0} active={active} onSeek={playTrack} /><div className="dp-wave-caption"><span>{active ? formatTime(position) : (track.releaseDate ? new Date(`${track.releaseDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '')}</span><span>{formatTime(track.duration)}</span></div></div>
                        <div className="dp-track-meta"><strong>{track.bpm || '—'}<small>BPM</small></strong><span>{track.formats?.map((format) => format.toUpperCase()).join(' / ')}</span></div>
                    </article>;
                })}</div>
                {!!tracks.length && <p className="dp-library-end">For your ears and your sets. Enjoy the dig.</p>}
            </section>
        </main>
        <footer className="dp-player" aria-label="Audio player"><div className="dp-container dp-player-inner">
            <div className="dp-now-playing"><Cover track={current} small /><div><strong>{current?.title || 'Find your next favourite.'}</strong><span>{current?.artist || 'Press play on a track to begin'}</span></div></div>
            <div className="dp-transport"><button className="dp-icon-button dp-skip" aria-label="Previous track" disabled={!current || queueIds.indexOf(currentId) <= 0} onClick={() => stepTrack(-1)}><SkipBack size={18} /></button><button className="dp-main-play" aria-label={playing ? 'Pause playback' : 'Play track'} disabled={!current && !filtered.length} onClick={() => playTrack(current || filtered[0])}>{buffering ? <LoaderCircle className="dp-spin" size={21} /> : <Icon playing={playing} size={21} />}</button><button className="dp-icon-button dp-skip" aria-label="Next track" disabled={!current || queueIds.indexOf(currentId) >= queueIds.length - 1} onClick={() => stepTrack(1)}><SkipForward size={18} /></button></div>
            <div className="dp-player-progress"><label className="dp-sr-only" htmlFor="dp-player-seek">Playback position</label><input id="dp-player-seek" type="range" min="0" max={current?.duration || 1} value={Math.min(position, current?.duration || 1)} step="0.1" disabled={!current} aria-valuetext={`${formatTime(position)} of ${formatTime(current?.duration)}`} onChange={(event) => { audioRef.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }} /><span>{formatTime(position)} / {formatTime(current?.duration)}</span></div>
            <label className="dp-volume"><Volume2 size={17} /><span className="dp-sr-only">Volume</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const next = Number(event.target.value); setVolume(next); audioRef.current.volume = next; }} /></label>
            <button className="dp-primary dp-export-button" disabled={!selectedTracks.length} onClick={() => setExportOpen(true)}><ArrowDownToLine size={17} /><span>Export</span><span className="dp-export-count">{selectedTracks.length}</span></button>
        </div>{message && <div className="dp-player-message" role="alert"><span>{message}</span><button className="dp-icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}><X size={16} /></button></div>}</footer>
        <audio ref={audioRef} preload="none" onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onLoadedMetadata={(event) => { if (pendingSeek.current) { event.currentTarget.currentTime = Math.min(pendingSeek.current, event.currentTarget.duration || pendingSeek.current); pendingSeek.current = 0; } }} onPlaying={() => { setPlaying(true); setBuffering(false); }} onPause={() => { setPlaying(false); setBuffering(false); }} onWaiting={() => setBuffering(true)} onEnded={() => stepTrack(1)} onError={() => { setPlaying(false); setBuffering(false); setMessage('This audio is unavailable. Try another track, or reload the page.'); }} />
        {exportOpen && <ExportDialog tracks={selectedTracks} onClose={() => setExportOpen(false)} />}
    </div>;
}
