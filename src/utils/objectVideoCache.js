export const EMPTY_OBJECT_VIDEO = Object.freeze({ status: 'idle', texture: null, alphaMap: null, active: false });

// Framework-independent lifecycle; browser/Three implementations are injected.
// A lease belongs to a mesh, while one decoder/texture belongs to a video URL.
export function createObjectVideoCache({
    createVideo, createTexture, loadAlpha, canPlay = () => true,
    schedule = setTimeout, cancel = clearTimeout, disposeDelay = 1000, loadTimeout = 15000,
    autoplayRetries = 2,
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
        record.playSucceeded = false;
    };

    const fail = (record) => {
        if (record.status === 'error' || record.disposed) return;
        cleanMedia(record);
        record.status = 'error';
        notify(record);
    };

    const markReady = (record) => {
        if (record.status === 'loading' && record.videoReady && record.alphaMap) {
            if (record.playSucceeded) {
                record.status = 'ready';
                notify(record);
            }
            // A selected object can finish buffering before the camera settles.
            // Waiting for navigation is not a media-loading failure.
            if (record.playSucceeded || !record.wanted) {
                cancel(record.timeout);
                record.timeout = null;
            }
        }
    };

    const rejectPlay = (record, error) => {
        if (error?.name !== 'NotAllowedError') { fail(record); return; }
        // iOS/low-power autoplay restrictions are not decode failures. Keep the
        // prepared source, show its poster, and wait for a bounded recovery signal.
        pause(record);
        record.playSucceeded = false;
        record.status = 'blocked';
        record.blockedAt = recoverySequence;
        cancel(record.timeout);
        record.timeout = null;
        notify(record);
    };

    const play = (record) => {
        if (!record.wanted || !record.video || record.playPending || record.playing
            || record.status === 'error' || record.status === 'blocked') return;
        const generation = record.generation;
        const epoch = ++record.playEpoch;
        record.playPending = true;
        let attempt;
        try { attempt = record.video.play(); } catch (error) { rejectPlay(record, error); return; }
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
        if (record.videoReady && record.alphaMap && (!record.wanted || record.playSucceeded)) return;
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
                if (video.videoWidth !== record.spec.width || video.videoHeight !== record.spec.height) {
                    fail(record);
                    return;
                }
                record.videoReady = video.readyState >= 2;
                markReady(record);
            };
            const error = () => {
                if (generation === record.generation) fail(record);
            };
            video.addEventListener('loadeddata', ready);
            video.addEventListener('canplay', ready);
            video.addEventListener('error', error);
            record.removeListeners = () => {
                video.removeEventListener('loadeddata', ready);
                video.removeEventListener('canplay', ready);
                video.removeEventListener('error', error);
            };
            armTimeout(record);
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
        if (canPlay()) {
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
                cancel(record.timeout);
                record.timeout = null;
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

    return {
        acquire(spec, listener = () => {}) {
            let record = records.get(spec.videoSrc);
            if (!record) {
                record = {
                    spec, owners: new Set(), status: 'idle', sequence: 0,
                    generation: 0, playEpoch: 0, playing: false, playPending: false,
                    wanted: false, disposed: false, texture: null, alphaMap: null,
                    autoplayRetries: 0, blockedAt: 0,
                };
                records.set(spec.videoSrc, record);
            }
            cancel(record.disposeTimer);
            const owner = { active: false, prepare: false, listener, snapshot: EMPTY_OBJECT_VIDEO };
            let released = false;
            record.owners.add(owner);
            owner.snapshot = Object.freeze({ status: record.status, texture: record.texture, alphaMap: record.alphaMap, active: false });
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
                    if (!record.owners.size) record.disposeTimer = schedule(() => {
                        if (record.owners.size) return;
                        record.disposed = true;
                        cleanMedia(record);
                        records.delete(spec.videoSrc);
                        observers.forEach((observer) => observer());
                    }, disposeDelay);
                },
            };
        },
        refresh,
        retryBlocked() {
            // A signal may arrive before React restores the selected lease after
            // visibilitychange. Retain it until that selection becomes active.
            recoverySequence += 1;
            refresh();
        },
        getStatus: (videoSrc) => records.get(videoSrc)?.status || 'idle',
        subscribe(listener) { observers.add(listener); return () => observers.delete(listener); },
    };
}
