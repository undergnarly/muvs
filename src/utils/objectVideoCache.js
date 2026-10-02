export const EMPTY_OBJECT_VIDEO = Object.freeze({ status: 'idle', texture: null, alphaMap: null, active: false });

// Framework-independent lifecycle; browser/Three implementations are injected.
// A lease belongs to a mesh, while one decoder/texture belongs to a video URL.
export function createObjectVideoCache({
    createVideo, createTexture, loadAlpha, canPlay = () => true,
    schedule = setTimeout, cancel = clearTimeout, disposeDelay = 1000, loadTimeout = 15000,
}) {
    const records = new Map();
    const observers = new Set();
    let activationSequence = 0;

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
        if (record.status === 'loading' && record.videoReady && record.alphaMap && record.playSucceeded) {
            record.status = 'ready';
            cancel(record.timeout);
            record.timeout = null;
            notify(record);
        }
    };

    const play = (record) => {
        if (!record.wanted || !record.video || record.playPending || record.playing || record.status === 'error') return;
        const generation = record.generation;
        const epoch = ++record.playEpoch;
        record.playPending = true;
        let attempt;
        try { attempt = record.video.play(); } catch { fail(record); return; }
        Promise.resolve(attempt).then(() => {
            if (record.disposed || generation !== record.generation || epoch !== record.playEpoch) return;
            record.playPending = false;
            record.playing = true;
            record.playSucceeded = true;
            if (!record.wanted) pause(record);
            markReady(record);
        }).catch(() => {
            // A pause/release invalidates that play attempt. A real rejection
            // falls back to the poster, with no automatic retry loop.
            if (!record.disposed && generation === record.generation && epoch === record.playEpoch) fail(record);
        });
    };

    const armTimeout = (record) => {
        if (record.timeout || record.status !== 'loading') return;
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
                if (record.owners.size && [...record.owners].some((owner) => owner.active)
                    && (!winner || record.sequence > winner.sequence)) winner = record;
            }
        }
        // Pause all previous sources before starting the next decoder.
        for (const record of records.values()) {
            record.wanted = record === winner;
            if (!record.wanted) {
                pause(record);
                cancel(record.timeout);
                record.timeout = null;
            }
        }
        if (winner) { load(winner); armTimeout(winner); play(winner); }
    };

    return {
        acquire(spec, listener = () => {}) {
            let record = records.get(spec.videoSrc);
            if (!record) {
                record = {
                    spec, owners: new Set(), status: 'idle', sequence: 0,
                    generation: 0, playEpoch: 0, playing: false, playPending: false,
                    wanted: false, disposed: false, texture: null, alphaMap: null,
                };
                records.set(spec.videoSrc, record);
            }
            cancel(record.disposeTimer);
            const owner = { active: false, listener, snapshot: EMPTY_OBJECT_VIDEO };
            let released = false;
            record.owners.add(owner);
            owner.snapshot = Object.freeze({ status: record.status, texture: record.texture, alphaMap: record.alphaMap, active: false });
            return {
                getSnapshot: () => owner.snapshot,
                setActive(active) {
                    if (released || owner.active === Boolean(active)) return;
                    owner.active = Boolean(active);
                    if (owner.active) record.sequence = ++activationSequence;
                    refresh();
                    notify(record);
                },
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
        retry(videoSrc) {
            const record = records.get(videoSrc);
            if (record?.status !== 'error') return;
            record.status = 'idle';
            notify(record);
            refresh();
        },
        getStatus: (videoSrc) => records.get(videoSrc)?.status || 'idle',
        subscribe(listener) { observers.add(listener); return () => observers.delete(listener); },
    };
}
