import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaCheck, FaCompactDisc, FaEdit, FaExternalLinkAlt, FaPlus, FaSearch, FaTrash, FaUpload } from 'react-icons/fa';
import Button from '../ui/Button';
import { validateImageFile } from '../../utils/imageCompression';
import { activityDate, loudnessLabel, parsePrivateRating, parseTrackTags, PRODUCTION_STAGES, sortAdminTracks, stageLabel } from './dubplatesAdminHelpers';
import './DubplatesManager.css';

const DRAFT_KEY = 'muvs-dubplates-editor-v1';
const MAX_AUDIO_BYTES = 95 * 1024 * 1024;
const EMPTY_FORM = {
    title: '', artist: 'MUVS', genre: '', bpm: '', musicalKey: '', releaseTitle: '',
    type: 'dubplate', releaseDate: '', coverImage: '', notes: '', published: false, assetId: null,
    tags: '', rating: '', productionStage: '',
};

function readDraft() {
    try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
        return draft?.form && typeof draft.form.title === 'string' ? draft : null;
    } catch {
        return null;
    }
}

function removeDraft() {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* Storage may be disabled. */ }
}

function durationLabel(seconds = 0) {
    const rounded = Math.floor(Number(seconds) || 0);
    return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

const DubplatesManager = () => {
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [sessionExpired, setSessionExpired] = useState(false);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [sort, setSort] = useState('recent');
    const [statistics, setStatistics] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisPolling, setAnalysisPolling] = useState(false);
    const [analysisAssetIds, setAnalysisAssetIds] = useState([]);
    const [analysisRemaining, setAnalysisRemaining] = useState(0);
    const [analysisNotice, setAnalysisNotice] = useState('');
    const [analysisError, setAnalysisError] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTrack, setEditingTrack] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [dirty, setDirty] = useState(false);
    const [recoveredDraft, setRecoveredDraft] = useState(readDraft);
    const [pendingAsset, setPendingAsset] = useState(null);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [formError, setFormError] = useState('');
    const [audioError, setAudioError] = useState('');
    const [pollError, setPollError] = useState('');
    const [pollRun, setPollRun] = useState(0);
    const [notice, setNotice] = useState('');
    const requests = useRef(new Set());
    const editorHeading = useRef(null);
    const formErrorElement = useRef(null);

    const request = useCallback(async (url, options = {}) => {
        const controller = new AbortController();
        requests.current.add(controller);
        const abort = () => controller.abort();
        if (options.signal?.aborted) controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
            if (response.status === 401) {
                setSessionExpired(true);
                throw new Error('Your session has expired. Sign in again, then retry. Your changes are still here.');
            }
            if (!response.ok) {
                throw new Error(result.error || (response.status === 413
                    ? 'This file is too large. Choose a smaller file and try again.'
                    : 'The request could not be completed. Please try again.'));
            }
            setSessionExpired(false);
            return result;
        } finally {
            options.signal?.removeEventListener('abort', abort);
            requests.current.delete(controller);
        }
    }, []);

    useEffect(() => {
        const activeRequests = requests.current;
        return () => activeRequests.forEach((controller) => controller.abort());
    }, []);

    const loadTracks = useCallback((signal) => request('/api/dubplates/admin/tracks', { signal })
        .then((result) => {
            if (!Array.isArray(result.tracks)) throw new Error('The track list could not be loaded. Please retry.');
            setTracks(result.tracks);
        })
        .catch((error) => {
            if (error.name !== 'AbortError') setListError(error.message);
        })
        .finally(() => {
            if (!signal?.aborted) setLoading(false);
        }), [request]);

    const loadStats = useCallback((signal) => request('/api/dubplates/admin/stats', { signal })
        .then((result) => {
            if (!result.totals || !Array.isArray(result.tracks) || !Array.isArray(result.recentDownloads)) {
                throw new Error('Activity could not be loaded. Please retry.');
            }
            setStatistics(result);
            setStatsError('');
        }).catch((error) => {
            if (error.name !== 'AbortError') setStatsError(error.message);
        }).finally(() => {
            if (!signal?.aborted) setStatsLoading(false);
        }), [request]);

    const refreshStats = () => {
        setStatsLoading(true);
        setStatsError('');
        loadStats();
    };

    useEffect(() => {
        const controller = new AbortController();
        loadTracks(controller.signal);
        loadStats(controller.signal);
        return () => controller.abort();
    }, [loadTracks, loadStats]);

    useEffect(() => {
        if (!analysisPolling) return;
        const controller = new AbortController();
        let timer;
        const startedAt = Date.now();
        const poll = async () => {
            try {
                const result = await request('/api/dubplates/admin/tracks', { signal: controller.signal });
                if (controller.signal.aborted) return;
                if (!Array.isArray(result.tracks)) throw new Error('Loudness progress could not be loaded. Try refreshing the library.');
                const attachedIds = new Set(result.tracks.map((track) => track.assetId));
                const unattachedAssets = await Promise.all(analysisAssetIds.filter((id) => !attachedIds.has(id)).map((id) => request(`/api/dubplates/admin/assets/${encodeURIComponent(id)}`, { signal: controller.signal })));
                if (controller.signal.aborted) return;
                setTracks(result.tracks);
                setPendingAsset((current) => {
                    const updated = unattachedAssets.find((asset) => asset.id === current?.id);
                    return updated ? { ...current, integratedLufs: updated.integratedLufs ?? null, loudnessStatus: updated.loudnessStatus } : current;
                });
                if (![...result.tracks, ...unattachedAssets.map((asset) => ({ ...asset, assetId: asset.id }))].some((track) => analysisAssetIds.includes(track.assetId) && ['pending', 'processing'].includes(track.loudnessStatus))) {
                    setAnalysisPolling(false);
                    setAnalysisNotice(`Loudness measurements updated.${analysisRemaining > 0 ? ` ${analysisRemaining} more audio files remain; run analysis again for the next batch.` : ' Tracks without a measurable level are marked unavailable.'}`);
                    return;
                }
                if (Date.now() - startedAt > 10 * 60 * 1000) {
                    setAnalysisPolling(false);
                    setAnalysisNotice('Analysis continues on the server. Refresh the library later to check progress.');
                    return;
                }
                timer = window.setTimeout(poll, 5000);
            } catch (error) {
                if (error.name !== 'AbortError') { setAnalysisError(error.message); setAnalysisPolling(false); }
            }
        };
        timer = window.setTimeout(poll, 2500);
        return () => { controller.abort(); window.clearTimeout(timer); };
    }, [analysisPolling, analysisAssetIds, analysisRemaining, request]);

    // Keep metadata and the processing job, never audio bytes or credentials.
    useEffect(() => {
        if (!editorOpen || !dirty) return;
        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, editingTrack, pendingAsset }));
        } catch { /* The beforeunload warning still protects unsaved edits. */ }
    }, [dirty, editingTrack, editorOpen, form, pendingAsset]);

    useEffect(() => {
        if (!dirty && !uploadingAudio && !uploadingCover) return;
        const warnBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        const confirmNavigation = (event) => {
            const link = event.target.closest?.('a[href]');
            if (!link || link.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const destination = new URL(link.href, window.location.href);
            if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
            if (!window.confirm('Leave with unsaved changes? A recovery draft will stay in this tab.')) {
                event.preventDefault();
                event.stopPropagation();
            }
        };
        window.addEventListener('beforeunload', warnBeforeUnload);
        document.addEventListener('click', confirmNavigation, true);
        return () => {
            window.removeEventListener('beforeunload', warnBeforeUnload);
            document.removeEventListener('click', confirmNavigation, true);
        };
    }, [dirty, uploadingAudio, uploadingCover]);

    useEffect(() => {
        if (editorOpen) editorHeading.current?.focus();
    }, [editorOpen]);

    useEffect(() => {
        if (formError) formErrorElement.current?.focus();
    }, [formError]);

    const processingId = pendingAsset?.status === 'processing' ? pendingAsset.id : null;
    useEffect(() => {
        if (!editorOpen || !processingId) return;
        const controller = new AbortController();
        let timer;
        const startedAt = Date.now();
        const poll = async () => {
            try {
                const asset = await request(`/api/dubplates/admin/assets/${encodeURIComponent(processingId)}`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                if (asset.status === 'ready') {
                    setPendingAsset((current) => ({ ...current, ...asset }));
                    setForm((current) => ({ ...current, assetId: asset.id }));
                    setDirty(true);
                    setPollError('');
                    return;
                }
                if (asset.status === 'error') {
                    setPendingAsset((current) => ({ ...current, ...asset }));
                    setAudioError(asset.error || 'Audio could not be processed. Try another WAV or MP3 file.');
                    return;
                }
                if (Date.now() - startedAt > 15 * 60 * 1000) {
                    setPollError('This is taking longer than expected. Check again in a moment; you do not need to upload the file again.');
                    return;
                }
                timer = window.setTimeout(poll, 2500);
            } catch (error) {
                if (error.name !== 'AbortError') setPollError(error.message);
            }
        };
        poll();
        return () => {
            controller.abort();
            window.clearTimeout(timer);
        };
    }, [editorOpen, processingId, pollRun, request]);

    const changeField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
        setDirty(true);
    };

    const openEditor = (track = null) => {
        if (dirty && !window.confirm('Discard the changes to this track?')) return;
        if (recoveredDraft && !dirty && !window.confirm('Discard your recovery draft and open another track?')) return;
        removeDraft();
        setRecoveredDraft(null);
        setEditingTrack(track);
        setForm(track ? {
            ...EMPTY_FORM,
            ...Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, track[key] ?? EMPTY_FORM[key]])),
            bpm: track.bpm ?? '',
            tags: parseTrackTags(track.tags).join(', '),
            rating: track.rating ?? '',
            productionStage: PRODUCTION_STAGES.some((stage) => stage.value === track.productionStage) ? track.productionStage : '',
        } : { ...EMPTY_FORM });
        setPendingAsset(null);
        setDirty(false);
        setFormError('');
        setAudioError('');
        setPollError('');
        setNotice('');
        setEditorOpen(true);
    };

    const closeEditor = () => {
        if (dirty && !window.confirm('Discard the changes to this track?')) return;
        removeDraft();
        setRecoveredDraft(null);
        setDirty(false);
        setEditorOpen(false);
        setPendingAsset(null);
    };

    const restoreDraft = () => {
        setForm({ ...EMPTY_FORM, ...recoveredDraft.form, tags: Array.isArray(recoveredDraft.form.tags) ? parseTrackTags(recoveredDraft.form.tags).join(', ') : recoveredDraft.form.tags || '' });
        setEditingTrack(recoveredDraft.editingTrack || null);
        setPendingAsset(recoveredDraft.pendingAsset || null);
        setDirty(true);
        setEditorOpen(true);
        setRecoveredDraft(null);
    };

    const uploadAudio = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setAudioError('');
        if (!/\.(wav|mp3)$/i.test(file.name) || !file.size || file.size > MAX_AUDIO_BYTES) {
            setAudioError('Choose a WAV or MP3 file, up to 95 MB.');
            return;
        }
        setUploadingAudio(true);
        setDirty(true);
        setPollError('');
        try {
            const body = new FormData();
            body.append('audio', file);
            const asset = await request('/api/dubplates/admin/assets', { method: 'POST', body });
            if (!asset.id || !['processing', 'ready'].includes(asset.status)) {
                throw new Error('The upload could not be confirmed. Please try again.');
            }
            setPendingAsset({ ...asset, filename: file.name });
            if (asset.status === 'ready') changeField('assetId', asset.id);
        } catch (error) {
            if (error.name !== 'AbortError') setAudioError(error.message);
        } finally {
            setUploadingAudio(false);
        }
    };

    const uploadCover = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setFormError('');
        setUploadingCover(true);
        try {
            validateImageFile(file);
            const body = new FormData();
            body.append('image', file);
            const result = await request('/api/upload', { method: 'POST', body });
            if (!result.url) throw new Error('The cover upload could not be confirmed. Please try again.');
            changeField('coverImage', result.url);
        } catch (error) {
            if (error.name !== 'AbortError') setFormError(error.message);
        } finally {
            setUploadingCover(false);
        }
    };

    const audioReady = Boolean(form.assetId && (
        pendingAsset?.id === form.assetId ? pendingAsset.status === 'ready' : editingTrack?.assetStatus === 'ready'
    ));
    const busy = uploadingAudio || uploadingCover || saving;
    const savedTrack = tracks.find((track) => track.id === editingTrack?.id) || editingTrack;
    const audioDetails = pendingAsset?.status === 'ready' ? pendingAsset : savedTrack;
    const editorAnalysisQueued = analysisPolling && analysisAssetIds.includes(form.assetId);
    const loudnessAssetId = editorOpen && audioReady && (audioDetails?.loudnessStatus === 'processing' || (audioDetails?.loudnessStatus === 'pending' && editorAnalysisQueued)) ? form.assetId : null;

    useEffect(() => {
        if (!loudnessAssetId) return;
        const controller = new AbortController();
        let timer;
        const startedAt = Date.now();
        const poll = async () => {
            try {
                const asset = await request(`/api/dubplates/admin/assets/${encodeURIComponent(loudnessAssetId)}`, { signal: controller.signal });
                if (controller.signal.aborted) return;
                const measurement = { integratedLufs: asset.integratedLufs ?? null, loudnessStatus: asset.loudnessStatus };
                setPendingAsset((current) => current?.id === asset.id ? { ...current, ...measurement } : current);
                setTracks((current) => current.map((track) => track.assetId === asset.id ? { ...track, ...measurement } : track));
                if (!['pending', 'processing'].includes(asset.loudnessStatus) || Date.now() - startedAt > 10 * 60 * 1000) return;
                timer = window.setTimeout(poll, 3000);
            } catch (error) {
                if (error.name !== 'AbortError') setAnalysisError(error.message);
            }
        };
        timer = window.setTimeout(poll, 2000);
        return () => { controller.abort(); window.clearTimeout(timer); };
    }, [loudnessAssetId, request]);

    const analyzeAudio = async (assetId = null) => {
        setAnalyzing(true);
        setAnalysisError('');
        setAnalysisNotice('');
        try {
            const result = await request('/api/dubplates/admin/loudness', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assetId ? { ids: [assetId] } : {}),
            });
            if (!Number.isFinite(result.queued)) throw new Error('Analysis could not be confirmed. Refresh and try again.');
            if (result.queued > 0) {
                setAnalysisNotice(`${result.queued} audio ${result.queued === 1 ? 'file queued' : 'files queued'} for loudness measurement.${result.pending > 0 ? ` ${result.pending} more remain; run analysis again after this batch.` : ''}`);
                setAnalysisAssetIds(Array.isArray(result.queuedIds) ? result.queuedIds : assetId ? [assetId] : []);
                setAnalysisRemaining(result.pending || 0);
                setAnalysisPolling(Array.isArray(result.queuedIds) ? result.queuedIds.length > 0 : Boolean(assetId));
                if (assetId) {
                    setPendingAsset((current) => current?.id === assetId ? { ...current, integratedLufs: null, loudnessStatus: 'pending' } : current);
                    setTracks((current) => current.map((track) => track.assetId === assetId ? { ...track, integratedLufs: null, loudnessStatus: 'pending' } : track));
                }
                await loadTracks();
            } else {
                setAnalysisNotice('No new audio queued. Measurements are up to date or already processing.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') setAnalysisError(error.message);
        } finally { setAnalyzing(false); }
    };

    const saveTrack = async (event) => {
        event.preventDefault();
        setFormError('');
        if (!form.title.trim()) {
            setFormError('Add a track title before saving.');
            return;
        }
        if (processingId) {
            setFormError('Wait for audio processing to finish, or discard the replacement before saving.');
            return;
        }
        if (form.published && !audioReady) {
            setFormError('Upload and process audio before publishing, or turn off Published to save a draft.');
            return;
        }
        let rating;
        try { rating = parsePrivateRating(form.rating); } catch (error) { setFormError(error.message); return; }
        const tags = parseTrackTags(form.tags);
        if (tags.length > 12 || tags.some((tag) => tag.length > 80)) {
            setFormError('Use up to 12 tags, with no more than 80 characters per tag.');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, title: form.title.trim(), artist: form.artist.trim() || 'MUVS', bpm: form.bpm === '' ? null : Number(form.bpm), tags, rating, productionStage: form.productionStage || null };
            const result = await request(editingTrack
                ? `/api/dubplates/admin/tracks/${encodeURIComponent(editingTrack.id)}`
                : '/api/dubplates/admin/tracks', {
                method: editingTrack ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!result.track?.id) throw new Error('The save could not be confirmed. Your changes are still here; please retry.');
            setTracks((current) => [result.track, ...current.filter((track) => track.id !== result.track.id)]);
            setNotice(`“${result.track.title}” saved${result.track.published ? ' and published' : ' as a draft'}.`);
            setEditorOpen(false);
            setDirty(false);
            setPendingAsset(null);
            setRecoveredDraft(null);
            removeDraft();
        } catch (error) {
            if (error.name !== 'AbortError') setFormError(error.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteTrack = async (track) => {
        if (!window.confirm(`Delete “${track.title}”? It will be removed from Dubplates. This cannot be undone.`)) return;
        setDeletingId(track.id);
        setListError('');
        setNotice('');
        try {
            await request(`/api/dubplates/admin/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
            setTracks((current) => current.filter((item) => item.id !== track.id));
            setNotice(`“${track.title}” deleted.`);
        } catch (error) {
            if (error.name !== 'AbortError') setListError(error.message);
        } finally {
            setDeletingId(null);
        }
    };

    const filteredTracks = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const matching = tracks.filter((track) => (
            (filter === 'all' || (filter === 'published' ? track.published : !track.published))
            && `${track.title} ${track.artist} ${track.genre} ${track.releaseTitle} ${parseTrackTags(track.tags).join(' ')}`.toLowerCase().includes(needle)
        ));
        return sortAdminTracks(matching, sort, statistics?.tracks);
    }, [tracks, query, filter, sort, statistics]);
    const publishedCount = tracks.filter((track) => track.published).length;
    const statsByTrack = useMemo(() => new Map((statistics?.tracks || []).map((track) => [track.id, track])), [statistics]);

    return (
        <div className="dubplates-admin">
            <header className="dpa-header">
                <div>
                    <span className="dpa-eyebrow">CONTENT / DUBPLATES</span>
                    <h1>Dubplates</h1>
                    <p>Full-length tracks for friends, DJs and producers.</p>
                </div>
                <div className="dpa-header-actions">
                    <a className="dpa-button" href="/dubplates" target="_blank" rel="noreferrer">Open Dubplates <FaExternalLinkAlt /></a>
                    {!editorOpen && <Button variant="accent" onClick={() => openEditor()}><FaPlus /> Add track</Button>}
                </div>
            </header>

            {sessionExpired && <div className="dpa-message dpa-warning" role="alert">
                <strong>Your session has expired.</strong>
                <span>Sign in in a new tab, then return here and retry. Your unsaved changes stay on this page.</span>
                <a href="/login" target="_blank" rel="noreferrer">Sign in again <FaExternalLinkAlt /></a>
            </div>}

            {!editorOpen && recoveredDraft && <div className="dpa-message dpa-warning">
                <span>You have an unsaved draft{recoveredDraft.form.title ? `: “${recoveredDraft.form.title}”` : ''}.</span>
                <div className="dpa-inline-actions">
                    <button type="button" className="dpa-button" onClick={restoreDraft}>Restore draft</button>
                    <button type="button" className="dpa-text-button" onClick={() => {
                        if (window.confirm('Discard the recovery draft?')) { removeDraft(); setRecoveredDraft(null); }
                    }}>Discard</button>
                </div>
            </div>}

            {notice && <div className="dpa-message dpa-success" role="status"><FaCheck /> {notice}</div>}
            {analysisNotice && <div className="dpa-message" role="status"><span>{analysisNotice}</span></div>}
            {analysisError && <div className="dpa-message dpa-error" role="alert"><span>{analysisError}</span><button type="button" className="dpa-button" onClick={() => { setAnalysisError(''); loadTracks(); }}>Refresh library</button></div>}

            {editorOpen ? <section className="dpa-editor" aria-labelledby="dpa-editor-title">
                <header className="dpa-editor-header">
                    <div>
                        <button type="button" className="dpa-text-button" onClick={closeEditor} disabled={busy}><FaArrowLeft /> Back to tracks</button>
                        <h2 id="dpa-editor-title" tabIndex={-1} ref={editorHeading}>{editingTrack ? 'Edit track' : 'New track'}</h2>
                    </div>
                    <span className="dpa-muted">{dirty ? 'Unsaved changes' : editingTrack?.published ? 'Published' : 'Draft'}</span>
                </header>
                <form onSubmit={saveTrack}>
                    <fieldset disabled={saving} className="dpa-form-fields">
                        <section className="dpa-form-section" aria-labelledby="dpa-audio-title">
                            <div className="dpa-section-heading"><h3 id="dpa-audio-title">Audio</h3><p>Upload WAV to offer WAV and MP3 downloads. MP3 uploads stay MP3. Up to 95 MB.</p></div>
                            <div className="dpa-audio-upload">
                                <FaCompactDisc className="dpa-audio-icon" aria-hidden="true" />
                                <div className="dpa-audio-info" aria-live="polite">
                                    <strong>{uploadingAudio ? 'Uploading audio…' : processingId ? 'Preparing audio and waveform…' : pendingAsset?.status === 'ready' ? 'New audio is ready' : audioReady ? 'Audio ready' : 'No audio uploaded'}</strong>
                                    <span>{uploadingAudio ? 'Keep this page open while the file uploads.' : pendingAsset?.filename || (audioReady ? `${durationLabel(audioDetails?.duration)} · ${(audioDetails?.formats || []).join(' + ').toUpperCase()}` : 'You can save a draft and add audio later.')}</span>
                                    {processingId && <span>The track will be ready to publish when processing finishes.</span>}
                                </div>
                                <label className={`dpa-button dpa-file-label${busy || processingId ? ' is-disabled' : ''}`}>
                                    <FaUpload /> {audioReady ? 'Replace audio' : 'Choose audio'}
                                    <input aria-label={audioReady ? 'Replace audio' : 'Upload audio'} type="file" accept=".wav,.mp3,audio/wav,audio/x-wav,audio/mpeg" onChange={uploadAudio} disabled={busy || Boolean(processingId)} />
                                </label>
                            </div>
                            {pendingAsset && <div className="dpa-replacement">
                                <span>{editingTrack?.assetId ? 'The saved audio stays unchanged until you save this track.' : 'Save the track to attach this audio.'}</span>
                                <button type="button" className="dpa-text-button" disabled={busy} onClick={() => {
                                    setPendingAsset(null); setAudioError(''); setPollError('');
                                    changeField('assetId', editingTrack?.assetId || null);
                                }}>{editingTrack?.assetId ? 'Keep saved audio' : 'Discard upload'}</button>
                            </div>}
                            {pendingAsset?.status === 'ready' && <p className="dpa-audio-ready"><FaCheck /> {durationLabel(pendingAsset.duration)} · {(pendingAsset.formats || []).join(' + ').toUpperCase()} available</p>}
                            {audioReady && <div className="dpa-loudness">
                                <div><strong>{editorAnalysisQueued && audioDetails?.loudnessStatus === 'pending' ? 'Loudness measurement queued…' : loudnessLabel(audioDetails)}</strong><small>Integrated loudness measured from the uploaded source, not the MP3 preview.</small></div>
                                {!Number.isFinite(audioDetails?.integratedLufs) && !['processing', 'unavailable'].includes(audioDetails?.loudnessStatus) && !editorAnalysisQueued && <button type="button" className="dpa-button" onClick={() => analyzeAudio(form.assetId)} disabled={analyzing || busy}>{analyzing ? 'Queuing…' : 'Measure loudness'}</button>}
                            </div>}
                            {audioError && <p className="dpa-inline-error" role="alert">{audioError}</p>}
                            {pollError && <div className="dpa-message dpa-warning" role="alert"><span>{pollError}</span><button className="dpa-button" type="button" onClick={() => { setPollError(''); setPollRun((value) => value + 1); }}>Check processing status</button></div>}
                            {editingTrack?.previewUrl && <div className="dpa-saved-preview"><span>Saved audio preview</span><audio controls preload="none" src={editingTrack.previewUrl}>Your browser does not support audio playback.</audio></div>}
                        </section>

                        <section className="dpa-form-section" aria-labelledby="dpa-details-title">
                            <div className="dpa-section-heading"><h3 id="dpa-details-title">Track details</h3><p>These details help listeners find the right track.</p></div>
                            <div className="dpa-fields dpa-fields-two">
                                <label className="dpa-field"><span>Track title <span aria-hidden="true">*</span></span><input required maxLength={160} value={form.title} onChange={(event) => changeField('title', event.target.value)} autoComplete="off" /></label>
                                <label className="dpa-field"><span>Artist</span><input maxLength={160} value={form.artist} onChange={(event) => changeField('artist', event.target.value)} autoComplete="off" /></label>
                                <label className="dpa-field"><span>Genre</span><input maxLength={80} value={form.genre} onChange={(event) => changeField('genre', event.target.value)} placeholder="e.g. Dub / Bass" list="dpa-genres" /><datalist id="dpa-genres">{[...new Set(tracks.map((track) => track.genre).filter(Boolean))].map((genre) => <option value={genre} key={genre} />)}</datalist></label>
                                <label className="dpa-field"><span>EP / release</span><input maxLength={160} value={form.releaseTitle} onChange={(event) => changeField('releaseTitle', event.target.value)} placeholder="Optional" /></label>
                            </div>
                            <div className="dpa-fields dpa-fields-four">
                                <label className="dpa-field"><span>BPM</span><input type="number" min={20} max={400} step="0.1" inputMode="decimal" value={form.bpm} onChange={(event) => changeField('bpm', event.target.value)} placeholder="Optional" /></label>
                                <label className="dpa-field"><span>Key</span><input maxLength={24} value={form.musicalKey} onChange={(event) => changeField('musicalKey', event.target.value)} placeholder="e.g. F minor" /></label>
                                <label className="dpa-field"><span>Type</span><select value={form.type} onChange={(event) => changeField('type', event.target.value)}><option value="dubplate">Dubplate</option><option value="release">Release</option></select></label>
                                <label className="dpa-field"><span>Release date</span><input type="date" value={form.releaseDate} onChange={(event) => changeField('releaseDate', event.target.value)} /></label>
                            </div>
                            <div className="dpa-fields dpa-fields-two">
                                <label className="dpa-field"><span>Production stage</span><select value={form.productionStage} onChange={(event) => changeField('productionStage', event.target.value)}>{PRODUCTION_STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select><small>Visible to listeners. Choose the current version of this track.</small></label>
                                <label className="dpa-field"><span>Private rating · 0–10</span><input type="number" min={0} max={10} step="0.1" inputMode="decimal" value={form.rating} onChange={(event) => changeField('rating', event.target.value)} aria-describedby="dpa-rating-help" placeholder="Unrated" /><small id="dpa-rating-help">Only you see this rating. Leave blank for unrated; 0 is a valid score.</small></label>
                            </div>
                            <label className="dpa-field dpa-tags-field"><span>Tags</span><input maxLength={1000} value={form.tags} onChange={(event) => changeField('tags', event.target.value)} placeholder="e.g. jungle, drum and bass" aria-describedby="dpa-tags-help" /><small id="dpa-tags-help">Separate tags with commas. Up to 12 tags, 80 characters each. Genre stays unchanged.</small></label>
                            {parseTrackTags(form.tags).length > 0 && <ul className="dpa-tags" aria-label="Tag preview">{parseTrackTags(form.tags).map((tag) => <li key={tag.toLowerCase()}>{tag}</li>)}</ul>}
                            <label className="dpa-field dpa-notes"><span>Track notes</span><textarea maxLength={2000} rows={3} value={form.notes} onChange={(event) => changeField('notes', event.target.value)} placeholder="Optional context for listeners" /><small>Visible on the Dubplates page.</small></label>
                        </section>

                        <section className="dpa-form-section" aria-labelledby="dpa-cover-title">
                            <div className="dpa-section-heading"><h3 id="dpa-cover-title">Artwork</h3><p>Optional square cover. JPG, PNG or WebP, up to 10 MB.</p></div>
                            <div className="dpa-artwork">
                                <div className="dpa-artwork-preview">{form.coverImage ? <img src={form.coverImage} alt="Track cover preview" /> : <FaCompactDisc aria-label="No cover" />}</div>
                                <div className="dpa-inline-actions">
                                    <label className={`dpa-button dpa-file-label${busy ? ' is-disabled' : ''}`}><FaUpload /> {uploadingCover ? 'Uploading cover…' : 'Upload cover'}<input aria-label="Upload track cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadCover} disabled={busy} /></label>
                                    {form.coverImage && <button type="button" className="dpa-text-button" disabled={busy} onClick={() => changeField('coverImage', '')}>Remove cover</button>}
                                </div>
                            </div>
                        </section>

                        <label className="dpa-publish-control"><input type="checkbox" checked={form.published} onChange={(event) => changeField('published', event.target.checked)} /><span><strong>Published</strong><small>{form.published ? 'Visible to anyone with the Dubplates link. Audio must be ready.' : 'Draft — only visible in this admin area.'}</small></span></label>
                    </fieldset>

                    {formError && <div className="dpa-message dpa-error" role="alert" tabIndex={-1} ref={formErrorElement}>{formError}</div>}
                    <footer className="dpa-form-actions">
                        <span>{processingId ? 'Audio is still processing.' : form.published ? 'This track will be available without a password.' : 'Save now, publish when ready.'}</span>
                        <div className="dpa-inline-actions"><button className="dpa-button" type="button" onClick={closeEditor} disabled={busy}>Cancel</button><Button variant="accent" type="submit" disabled={busy || Boolean(processingId)}>{saving ? 'Saving…' : form.published ? 'Save & publish' : 'Save draft'}</Button></div>
                    </footer>
                </form>
            </section> : <>
                <section className="dpa-activity" aria-labelledby="dpa-activity-title" aria-busy={statsLoading}>
                    <div className="dpa-activity-heading">
                        <div><h2 id="dpa-activity-title">Listener activity</h2><p>See which tracks people listen to and take with them.</p></div>
                        <button type="button" className="dpa-button" onClick={() => { refreshStats(); loadTracks(); }} disabled={statsLoading}>{statsLoading ? 'Refreshing…' : 'Refresh activity'}</button>
                    </div>
                    {statsError && <div className="dpa-message dpa-error" role="alert"><span>{statsError}</span><button type="button" className="dpa-button" onClick={refreshStats} disabled={statsLoading}>Retry activity</button></div>}
                    {!statistics && statsLoading ? <p className="dpa-muted" role="status">Loading listener activity…</p> : statistics && <>
                        <dl className="dpa-activity-totals"><div><dt>Track downloads</dt><dd>{statistics.totals.downloads ?? 0}</dd></div><div><dt>Qualified listens</dt><dd>{statistics.totals.listens ?? 0}</dd></div><div className="dpa-activity-since"><dt>Tracking since</dt><dd>{activityDate(statistics.since)}</dd></div></dl>
                        <p className="dpa-activity-explainer">A listen counts after 30 seconds, or half of a shorter track. Downloads count completed server transfers, not a guaranteed file save. This dashboard shows aggregate activity, not individual people. Earlier activity is not available.</p>
                        <details className="dpa-recent-downloads"><summary>Recent downloads{statistics.recentDownloads.length ? ` (${statistics.recentDownloads.length})` : ''}</summary>
                            {statistics.recentDownloads.length ? <ol>{statistics.recentDownloads.slice(0, 20).map((download, index) => <li key={`${download.at}-${index}`}><div><strong>{(download.trackIds || []).map((id) => statsByTrack.get(id)?.title || 'Removed track').join(', ') || 'Track download'}</strong><span>{String(download.format || '').toUpperCase()} · {download.delivery === 'file' ? 'Single file' : 'ZIP archive'}</span></div><time dateTime={download.at}>{activityDate(download.at)}</time></li>)}</ol> : <p>No downloads recorded yet.</p>}
                        </details>
                    </>}
                </section>
                <div className="dpa-library-heading"><h2>Track library</h2><button type="button" className="dpa-button" onClick={() => analyzeAudio()} disabled={analyzing || analysisPolling}>{analyzing ? 'Queuing analysis…' : analysisPolling ? 'Measuring loudness…' : 'Analyze existing audio'}</button></div>
                <p className="dpa-analysis-help">LUFS-I is measured automatically for new uploads. Analyze existing audio to measure earlier uploads in batches, without replacing or changing your files.</p>
                <div className="dpa-list-toolbar">
                    <label className="dpa-search"><FaSearch aria-hidden="true" /><input type="search" aria-label="Search Dubplates tracks" placeholder="Search title, artist, genre, tags or EP" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                    <label className="dpa-status-filter"><span className="dpa-sr-only">Track status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All tracks ({tracks.length})</option><option value="published">Published ({publishedCount})</option><option value="draft">Drafts ({tracks.length - publishedCount})</option></select></label>
                    <label className="dpa-status-filter"><span className="dpa-sr-only">Sort tracks</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Newest added</option><option value="downloads" disabled={!statistics}>Most downloaded</option><option value="listens" disabled={!statistics}>Most listened</option><option value="rating">Private rating</option><option value="title">Title A–Z</option></select></label>
                </div>
                <p className="dpa-access-note">Not linked in the site menu or included in search indexing. Anyone with the link can listen and download.</p>
                {listError && <div className="dpa-message dpa-error" role="alert"><span>{listError}</span><button className="dpa-button" type="button" onClick={() => { setLoading(true); setListError(''); loadTracks(); }}>Retry</button></div>}
                {loading ? <div className="dpa-empty" role="status">Loading tracks…</div> : filteredTracks.length ? <div className="dpa-track-list" aria-label="Dubplates tracks">
                    {filteredTracks.map((track) => <article className="dpa-track" key={track.id}>
                        <div className="dpa-track-cover">{track.coverImage ? <img src={track.coverImage} alt="" loading="lazy" /> : <FaCompactDisc aria-hidden="true" />}</div>
                        <div className="dpa-track-info"><h3>{track.title}</h3><p>{[track.artist, track.genre, track.bpm ? `${track.bpm} BPM` : null, track.releaseTitle].filter(Boolean).join(' · ')}</p><span>{track.type === 'release' ? 'Release' : 'Dubplate'}{track.releaseDate ? ` · ${track.releaseDate}` : ''}{track.duration ? ` · ${durationLabel(track.duration)}` : ''}</span>
                            <p className="dpa-track-metadata">{stageLabel(track.productionStage)} · {loudnessLabel(track)} · Private rating: {Number.isFinite(track.rating) ? `${track.rating}/10` : 'unrated'}</p>
                            {parseTrackTags(track.tags).length > 0 && <ul className="dpa-tags" aria-label={`${track.title} tags`}>{parseTrackTags(track.tags).map((tag) => <li key={tag.toLowerCase()}>{tag}</li>)}</ul>}
                            {statistics && <div className="dpa-track-activity"><span><strong>{statsByTrack.get(track.id)?.downloads || 0}</strong> downloads</span><span><strong>{statsByTrack.get(track.id)?.listens || 0}</strong> listens</span><span>MP3 {statsByTrack.get(track.id)?.mp3 || 0} · WAV {statsByTrack.get(track.id)?.wav || 0}</span>{statsByTrack.get(track.id)?.lastDownloadedAt && <span>Last download: {activityDate(statsByTrack.get(track.id).lastDownloadedAt)}</span>}</div>}
                        </div>
                        <div className="dpa-track-status"><span className={`dpa-badge${track.published ? ' is-published' : ''}`}>{track.published ? 'Published' : 'Draft'}</span><small>{track.formats?.length ? track.formats.join(' + ').toUpperCase() : 'No audio'}</small></div>
                        <div className="dpa-track-actions"><button className="dpa-button" type="button" onClick={() => openEditor(track)} disabled={deletingId !== null}><FaEdit /> Edit<span className="dpa-sr-only"> {track.title}</span></button><button className="dpa-delete" type="button" title={`Delete ${track.title}`} aria-label={`Delete ${track.title}`} onClick={() => deleteTrack(track)} disabled={deletingId !== null}>{deletingId === track.id ? '…' : <FaTrash />}</button></div>
                    </article>)}
                </div> : !listError && <div className="dpa-empty"><FaCompactDisc aria-hidden="true" /><h2>{tracks.length ? 'No matching tracks' : 'Your first dubplate starts here'}</h2><p>{tracks.length ? 'Try another search or show all tracks.' : 'Add a track, upload the audio and publish when it is ready.'}</p>{tracks.length ? <button className="dpa-button" type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button> : <Button variant="accent" onClick={() => openEditor()}><FaPlus /> Add track</Button>}</div>}
            </>}
        </div>
    );
};

export default DubplatesManager;
