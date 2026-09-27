import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaCheck, FaCompactDisc, FaEdit, FaExternalLinkAlt, FaPlus, FaSearch, FaTrash, FaUpload } from 'react-icons/fa';
import Button from '../ui/Button';
import { validateImageFile } from '../../utils/imageCompression';
import './DubplatesManager.css';

const DRAFT_KEY = 'muvs-dubplates-editor-v1';
const MAX_AUDIO_BYTES = 95 * 1024 * 1024;
const EMPTY_FORM = {
    title: '', artist: 'MUVS', genre: '', bpm: '', musicalKey: '', releaseTitle: '',
    type: 'dubplate', releaseDate: '', coverImage: '', notes: '', published: false, assetId: null,
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

    useEffect(() => {
        const controller = new AbortController();
        loadTracks(controller.signal);
        return () => controller.abort();
    }, [loadTracks]);

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
        setForm({ ...EMPTY_FORM, ...recoveredDraft.form });
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
    const audioDetails = pendingAsset?.status === 'ready' ? pendingAsset : editingTrack;

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
        setSaving(true);
        try {
            const payload = { ...form, title: form.title.trim(), artist: form.artist.trim() || 'MUVS', bpm: form.bpm === '' ? null : Number(form.bpm) };
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
        return tracks.filter((track) => (
            (filter === 'all' || (filter === 'published' ? track.published : !track.published))
            && `${track.title} ${track.artist} ${track.genre} ${track.releaseTitle}`.toLowerCase().includes(needle)
        )).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }, [tracks, query, filter]);
    const publishedCount = tracks.filter((track) => track.published).length;

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
                <div className="dpa-list-toolbar">
                    <label className="dpa-search"><FaSearch aria-hidden="true" /><input type="search" aria-label="Search Dubplates tracks" placeholder="Search title, artist, genre or EP" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
                    <label className="dpa-status-filter"><span className="dpa-sr-only">Track status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All tracks ({tracks.length})</option><option value="published">Published ({publishedCount})</option><option value="draft">Drafts ({tracks.length - publishedCount})</option></select></label>
                </div>
                <p className="dpa-access-note">Not linked in the site menu or included in search indexing. Anyone with the link can listen and download.</p>
                {listError && <div className="dpa-message dpa-error" role="alert"><span>{listError}</span><button className="dpa-button" type="button" onClick={() => { setLoading(true); setListError(''); loadTracks(); }}>Retry</button></div>}
                {loading ? <div className="dpa-empty" role="status">Loading tracks…</div> : filteredTracks.length ? <div className="dpa-track-list" aria-label="Dubplates tracks">
                    {filteredTracks.map((track) => <article className="dpa-track" key={track.id}>
                        <div className="dpa-track-cover">{track.coverImage ? <img src={track.coverImage} alt="" loading="lazy" /> : <FaCompactDisc aria-hidden="true" />}</div>
                        <div className="dpa-track-info"><h2>{track.title}</h2><p>{[track.artist, track.genre, track.bpm ? `${track.bpm} BPM` : null, track.releaseTitle].filter(Boolean).join(' · ')}</p><span>{track.type === 'release' ? 'Release' : 'Dubplate'}{track.releaseDate ? ` · ${track.releaseDate}` : ''}{track.duration ? ` · ${durationLabel(track.duration)}` : ''}</span></div>
                        <div className="dpa-track-status"><span className={`dpa-badge${track.published ? ' is-published' : ''}`}>{track.published ? 'Published' : 'Draft'}</span><small>{track.formats?.length ? track.formats.join(' + ').toUpperCase() : 'No audio'}</small></div>
                        <div className="dpa-track-actions"><button className="dpa-button" type="button" onClick={() => openEditor(track)} disabled={deletingId !== null}><FaEdit /> Edit<span className="dpa-sr-only"> {track.title}</span></button><button className="dpa-delete" type="button" title={`Delete ${track.title}`} aria-label={`Delete ${track.title}`} onClick={() => deleteTrack(track)} disabled={deletingId !== null}>{deletingId === track.id ? '…' : <FaTrash />}</button></div>
                    </article>)}
                </div> : !listError && <div className="dpa-empty"><FaCompactDisc aria-hidden="true" /><h2>{tracks.length ? 'No matching tracks' : 'Your first dubplate starts here'}</h2><p>{tracks.length ? 'Try another search or show all tracks.' : 'Add a track, upload the audio and publish when it is ready.'}</p>{tracks.length ? <button className="dpa-button" type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear filters</button> : <Button variant="accent" onClick={() => openEditor()}><FaPlus /> Add track</Button>}</div>}
            </>}
        </div>
    );
};

export default DubplatesManager;
