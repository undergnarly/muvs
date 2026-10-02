let timelineSequence = 0;

export const getObjectEntranceKind = (poster) => {
    if (poster === '/images/menu/music2.webp') return 'music';
    if (poster === '/images/menu/mixes-trans.webp') return 'mixes';
    if (poster === '/images/menu/code2.webp') return 'code';
    return null;
};

export function createObjectEntranceTimeline({ duration = 2.4, assetTimeout = 2, maxDelta = 0.05 } = {}) {
    const scope = ++timelineSequence;
    let occurrence = 0;
    let lastFrame = null;
    let waiting = 0;
    const state = { key: null, kind: null, elapsed: 0, duration, phase: 'cancelled', selectionToken: null };
    const complete = () => { state.phase = 'complete'; state.elapsed = state.duration; };

    return {
        state,
        select(key, kind) {
            key = key || null;
            kind = kind || null;
            if (key === state.key && kind === state.kind) return state.selectionToken;
            state.key = key;
            state.kind = kind;
            state.elapsed = 0;
            state.phase = key && kind ? 'pending' : 'cancelled';
            state.selectionToken = `${scope}:${++occurrence}`;
            lastFrame = null;
            waiting = 0;
            return state.selectionToken;
        },
        advance(key, { frame, delta, eligible, skip = false, mediaStatus = 'ready' }) {
            if (key !== state.key || !state.kind || state.phase === 'complete' || state.phase === 'cancelled') return;
            if (skip) { complete(); return; }
            if (!eligible || frame === lastFrame) return;
            lastFrame = frame;
            const dt = Math.max(0, Math.min(maxDelta, Number.isFinite(delta) ? delta : 0));
            if (state.phase === 'pending') {
                if (mediaStatus === 'error') { complete(); return; }
                if (mediaStatus !== 'ready') {
                    waiting += dt;
                    if (waiting >= assetTimeout) complete();
                    return;
                }
                state.phase = 'intro';
                state.elapsed = 0;
                return;
            }
            state.elapsed = Math.min(state.duration, state.elapsed + dt);
            if (state.elapsed >= state.duration) complete();
        },
        sample(key, target) {
            const selected = key === state.key && Boolean(key);
            target.kind = selected ? state.kind : null;
            target.elapsed = selected ? state.elapsed : 0;
            target.duration = state.duration;
            target.phase = selected ? state.phase : 'cancelled';
            target.selectionToken = selected ? state.selectionToken : null;
            return target;
        },
    };
}
