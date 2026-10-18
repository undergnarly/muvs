const SESSION_KEY = 'muvs-dubplates-listening-session';

export function listeningSession(storage, random = globalThis.crypto) {
    let existing;
    try { existing = (storage === undefined ? globalThis.sessionStorage : storage)?.getItem(SESSION_KEY); } catch { /* Session storage is optional. */ }
    if (/^[a-f0-9]{32}$/.test(existing || '')) return existing;
    if (!random?.getRandomValues) return null;
    const id = Array.from(random.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    try { (storage === undefined ? globalThis.sessionStorage : storage)?.setItem(SESSION_KEY, id); } catch { /* In-memory session still works. */ }
    return id;
}

export function createListeningMeter({ now = () => performance.now(), onListen = () => {} } = {}) {
    const progress = new Map();
    let track = null, previousTime = null, previousPosition = null;
    function resetSample() { previousTime = null; previousPosition = null; }
    return {
        select(next) { track = next; resetSample(); },
        suspend: resetSample,
        sample(audio) {
            if (!track || audio.paused || audio.ended || audio.seeking || audio.readyState < 3) { resetSample(); return; }
            const time = now();
            const position = Number(audio.currentTime);
            const duration = Number(track.duration);
            if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) { resetSample(); return; }
            const entry = progress.get(track.id) || { seconds: 0, sent: false };
            progress.set(track.id, entry);
            if (!entry.sent && previousTime !== null) {
                const elapsed = Math.max(0, (time - previousTime) / 1000);
                const moved = position - previousPosition;
                const rate = Number(audio.playbackRate) || 1;
                if (moved > 0 && moved <= elapsed * rate + 0.75) {
                    entry.seconds += Math.min(elapsed, moved / rate, 2);
                    if (entry.seconds >= Math.min(30, duration * 0.5)) {
                        entry.sent = true;
                        onListen(track.id);
                    }
                }
            }
            previousTime = time;
            previousPosition = position;
        },
    };
}
