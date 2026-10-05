export const EMPTY_OBJECT_VIDEO = Object.freeze({ status: 'idle', texture: null, alphaMap: null, active: false, prepared: false, buffered: false });

function isFullyBuffered(video) {
    try {
        const duration = video?.duration;
        const ranges = video?.buffered;
        if (!Number.isFinite(duration) || duration <= 0 || !ranges?.length) return false;
        let end = 0;
        for (let index = 0; index < ranges.length; index += 1) {
            if (ranges.start(index) > end + 0.05) return false;
            end = Math.max(end, ranges.end(index));
            if (end >= duration - 0.05) return true;
        }
    } catch { return false; }
    return false;
}

// Framework-independent lifecycle; browser/Three implementations are injected.
// A lease belongs to a mesh, while one decoder/texture belongs to a video URL.
export function createObjectVideoCache({
    createVideo, createTexture, loadAlpha, canPlay = () => true,
    verifyFrame = (video) => !video.seeking && video.readyState >= 2,
    schedule = setTimeout, cancel = clearTimeout, disposeDelay = 1000, loadTimeout = 15000,
    autoplayRetries = 2, warmTimeout = 8000,
}) {
    const records = new Map();
    const observers = new Set();
    let activationSequence = 0;
    let recoverySequence = 0;

    const notify = (record) => {
        for (const owner of record.owners) {
            owner.snapshot = Object.freeze({
                status: record.status,
                texture: record.status === 'ready' ? record.texture : null,
                alphaMap: record.status === 'ready' ? record.alphaMap : null,
                active: owner.active,
                prepared: record.prepared,
                buffered: record.buffered,
            });
            owner.listener();
        }
        observers.forEach((listener) => listener());
    };

    const pause = (record) => {
        if (record.playing || record.playPending) {
            record.playEpoch += 1;
            record.playPending = false;
            record.playing = false;
            record.video?.pause();
        }
    };

    const cleanMedia = (record) => {
        record.generation += 1;
        pause(record);
        cancel(record.timeout);
        record.timeout = null;
        if (record.frameCallback != null) record.video?.cancelVideoFrameCallback?.(record.frameCallback);
        record.frameCallback = null;
        record.frameAttempts = 0;
        record.removeListeners?.();
        record.removeListeners = null;
        if (record.video) {
            record.video.pause();
            record.video.removeAttribute('src');
            record.video.load();
        }
        record.texture?.dispose();
        record.alphaMap?.dispose();
        record.video = null;
        record.texture = null;
        record.alphaMap = null;
        record.videoReady = false;
        record.frameReady = false;
        record.prepared = false;
        record.buffered = false;
        record.playSucceeded = false;
    };

    const disposeUnused = (record) => {
        if (record.owners.size || record.warmPinned || record.warmResolve) return;
        cancel(record.disposeTimer);
        record.disposeTimer = schedule(() => {
            if (record.owners.size || record.warmPinned || record.warmResolve) return;
            record.disposed = true;
            cleanMedia(record);
            records.delete(record.spec.videoSrc);
            observers.forEach((observer) => observer());
        }, disposeDelay);
    };

    const finishWarm = (record, status) => {
        if (!record.warmResolve) return;
        const resolve = record.warmResolve;
        record.warmResolve = null;
        cancel(record.warmTimer);
        record.warmTimer = null;
        if (status !== 'ready') record.warmPinned = false;
        if (status === 'skipped') record.warmPromise = null;
        resolve({ status, videoSrc: record.spec.videoSrc });
        disposeUnused(record);
    };

    const fail = (record) => {
        if (record.status === 'error' || record.disposed) return;
        cleanMedia(record);
        record.status = 'error';
        finishWarm(record, 'error');
        notify(record);
    };

    const markReady = (record) => {
        const prepared = Boolean(record.videoReady && record.alphaMap);
        const buffered = isFullyBuffered(record.video);
        let changed = prepared !== record.prepared || buffered !== record.buffered;
        record.prepared = prepared;
        record.buffered = buffered;
        if (!prepared && record.status === 'ready') { record.status = 'loading'; changed = true; }
        if (prepared) {
            // VideoTexture's rVFC path does not dirty its first frame until a
            // callback arrives. Explicitly upload only a verified decoded frame.
            record.texture.needsUpdate = true;
            if (buffered) finishWarm(record, 'ready');
        }
        if (record.status === 'loading' && prepared && record.frameReady && record.playSucceeded) {
            record.status = 'ready';
            changed = true;
        }
        if (prepared && (!record.wanted || record.status === 'ready' || record.status === 'blocked')) {
            cancel(record.timeout);
            record.timeout = null;
        }
        if (changed) notify(record);
    };

    const readFrame = (record) => {
        const video = record.video;
        if (!video || video.seeking || video.readyState < 2) return;
        if (video.videoWidth !== record.spec.width || video.videoHeight !== record.spec.height) { fail(record); return; }
        if (!record.videoReady) {
            try { record.videoReady = Boolean(verifyFrame(video)); } catch { record.videoReady = false; }
        }
        if (typeof video.requestVideoFrameCallback !== 'function') record.frameReady = record.videoReady;
        markReady(record);
    };

    const requestFirstFrame = (record) => {
        if (record.frameReady || record.frameCallback != null || record.frameAttempts >= 3
            || typeof record.video?.requestVideoFrameCallback !== 'function') return;
        const generation = record.generation;
        record.frameAttempts += 1;
        record.frameCallback = record.video.requestVideoFrameCallback(() => {
            if (record.disposed || generation !== record.generation) return;
            record.frameCallback = null;
            record.frameReady = true;
            readFrame(record);
            if (!record.videoReady && !record.disposed && generation === record.generation) {
                record.frameReady = false;
                requestFirstFrame(record);
            }
        });
    };

    const blockPlayback = (record) => {
        pause(record);
        record.playSucceeded = false;
        record.status = 'blocked';
        record.blockedAt = recoverySequence;
        cancel(record.timeout);
        record.timeout = null;
        notify(record);
    };

    const rejectPlay = (record, error) => {
        if (error?.name !== 'NotAllowedError') { fail(record); return; }
        blockPlayback(record);
    };

    const play = (record) => {
        if (!record.wanted || !record.video || record.playPending || record.playing
            || record.status === 'error' || record.status === 'blocked') return;
        const generation = record.generation;
        const epoch = ++record.playEpoch;
        record.playPending = true;
        let attempt;
        try { requestFirstFrame(record); attempt = record.video.play(); } catch (error) { rejectPlay(record, error); return; }
        Promise.resolve(attempt).then(() => {
            if (record.disposed || generation !== record.generation || epoch !== record.playEpoch) return;
            record.playPending = false;
            record.playing = true;
            record.playSucceeded = true;
            if (!record.wanted) pause(record);
            markReady(record);
        }).catch((error) => {
            // A pause/release invalidates that play attempt; it must not affect
            // the newly selected object or spend its recovery budget.
            if (!record.disposed && generation === record.generation && epoch === record.playEpoch) rejectPlay(record, error);
        });
    };

    const armTimeout = (record) => {
        if (record.timeout || record.status !== 'loading') return;
        if (record.prepared && (!record.wanted || record.playSucceeded && record.frameReady)) return;
        const generation = record.generation;
        record.timeout = schedule(() => {
            if (generation === record.generation && record.status === 'loading') fail(record);
        }, loadTimeout);
    };

    const load = (record) => {
        if (record.status !== 'idle') return;
        record.status = 'loading';
        const generation = ++record.generation;
        try {
            const video = createVideo();
            record.video = video;
            record.texture = createTexture(video);
            const ready = () => {
                if (record.disposed || generation !== record.generation) return;
                readFrame(record);
            };
            const error = () => {
                if (generation === record.generation) fail(record);
            };
            const paused = () => {
                if (record.disposed || generation !== record.generation || !video.paused
                    || (!record.playing && !record.playPending)) return;
                if (record.wanted && canPlay()) blockPlayback(record);
                else pause(record);
            };
            video.addEventListener('loadeddata', ready);
            video.addEventListener('canplay', ready);
            video.addEventListener('seeked', ready);
            video.addEventListener('progress', ready);
            video.addEventListener('canplaythrough', ready);
            video.addEventListener('error', error);
            video.addEventListener('pause', paused);
            record.removeListeners = () => {
                video.removeEventListener('loadeddata', ready);
                video.removeEventListener('canplay', ready);
                video.removeEventListener('seeked', ready);
                video.removeEventListener('progress', ready);
                video.removeEventListener('canplaythrough', ready);
                video.removeEventListener('error', error);
                video.removeEventListener('pause', paused);
            };
            armTimeout(record);
            requestFirstFrame(record);
            video.src = record.spec.videoSrc;
            video.load();
            Promise.resolve(loadAlpha(record.spec)).then((texture) => {
                if (record.disposed || generation !== record.generation) { texture.dispose(); return; }
                record.alphaMap = texture;
                markReady(record);
            }).catch(() => {
                if (generation === record.generation) fail(record);
            });
            notify(record);
        } catch { fail(record); }
    };

    const refresh = () => {
        let winner = null;
        const allowed = canPlay();
        if (allowed) {
            for (const record of records.values()) {
                if (record.owners.size && [...record.owners].some((owner) => owner.prepare || owner.active)
                    && (!winner || record.sequence > winner.sequence)) winner = record;
            }
        }
        // Pause all previous sources before starting the next decoder.
        for (const record of records.values()) {
            record.wanted = record === winner && [...record.owners].some((owner) => owner.active);
            if (!record.wanted) {
                pause(record);
            }
            if (!allowed && record.warmResolve) {
                finishWarm(record, record.prepared && record.buffered ? 'ready' : 'skipped');
                if (!record.owners.size && !(record.prepared && record.buffered)) { cleanMedia(record); record.status = 'idle'; }
            }
            if (!(allowed && (record === winner || record.warmResolve))) {
                cancel(record.timeout);
                record.timeout = null;
            }
        }
        // Splash warming may prepare all approved sources in parallel, but only
        // the selected winner below can ever call play().
        if (allowed) {
            for (const record of records.values()) {
                if (record.warmResolve) { load(record); armTimeout(record); }
            }
        }
        if (winner) {
            load(winner);
            if (winner.wanted && winner.status === 'blocked' && recoverySequence > winner.blockedAt
                && winner.autoplayRetries < autoplayRetries) {
                winner.autoplayRetries += 1;
                winner.status = 'loading';
                notify(winner);
            }
            armTimeout(winner);
            play(winner);
        }
    };

    const getRecord = (spec) => {
        let record = records.get(spec.videoSrc);
        if (!record) {
            record = {
                spec, owners: new Set(), status: 'idle', sequence: 0,
                generation: 0, playEpoch: 0, playing: false, playPending: false,
                wanted: false, disposed: false, texture: null, alphaMap: null,
                prepared: false, buffered: false, videoReady: false, frameReady: false, frameCallback: null, frameAttempts: 0,
                autoplayRetries: 0, blockedAt: 0, warmPinned: false,
            };
            records.set(spec.videoSrc, record);
        }
        cancel(record.disposeTimer);
        return record;
    };

    return {
        preload(spec) {
            const existing = records.get(spec.videoSrc);
            if (!canPlay() && !(existing?.prepared && existing?.buffered)) return Promise.resolve({ status: 'skipped', videoSrc: spec.videoSrc });
            const record = getRecord(spec);
            if (record.warmPromise) {
                if (record.status !== 'error' && !record.owners.size) record.warmPinned = true;
                else disposeUnused(record);
                return record.warmPromise;
            }
            record.warmPinned = !record.owners.size;
            const promise = new Promise((resolve) => { record.warmResolve = resolve; });
            record.warmPromise = promise;
            record.warmTimer = schedule(() => {
                finishWarm(record, 'error');
                if (!record.owners.size && !record.prepared) fail(record);
            }, warmTimeout);
            if (record.prepared && record.buffered) finishWarm(record, 'ready');
            else if (record.status === 'error') finishWarm(record, 'error');
            else refresh();
            return promise;
        },
        acquire(spec, listener = () => {}) {
            const record = getRecord(spec);
            record.warmPinned = false;
            const owner = { active: false, prepare: false, listener, snapshot: EMPTY_OBJECT_VIDEO };
            let released = false;
            record.owners.add(owner);
            owner.snapshot = Object.freeze({
                status: record.status, prepared: record.prepared, buffered: record.buffered, active: false,
                texture: record.status === 'ready' ? record.texture : null,
                alphaMap: record.status === 'ready' ? record.alphaMap : null,
            });
            const setPlayback = ({ prepare = false, active = false }) => {
                active = Boolean(active);
                prepare = Boolean(prepare || active);
                if (released || (owner.active === active && owner.prepare === prepare)) return;
                if ((active && !owner.active) || (prepare && !owner.prepare)) record.sequence = ++activationSequence;
                owner.active = active;
                owner.prepare = prepare;
                refresh();
                notify(record);
            };
            return {
                getSnapshot: () => owner.snapshot,
                setPlayback,
                setActive: (active) => setPlayback({ active }),
                release() {
                    if (released) return;
                    released = true;
                    record.owners.delete(owner);
                    refresh();
                    disposeUnused(record);
                },
            };
        },
        refresh,
        retryBlocked({ userGesture = false } = {}) {
            if (userGesture && canPlay()) {
                for (const record of records.values()) {
                    if (record.wanted && record.status === 'blocked') record.autoplayRetries = 0;
                }
            }
            // A signal may arrive before React restores the selected lease after
            // visibilitychange. Retain it until that selection becomes active.
            recoverySequence += 1;
            refresh();
        },
        getStatus: (videoSrc) => records.get(videoSrc)?.status || 'idle',
        subscribe(listener) { observers.add(listener); return () => observers.delete(listener); },
    };
}
