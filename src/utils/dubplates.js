export const INITIAL_FILTERS = { query: '', type: '', genre: '', release: '', bpmMin: '', bpmMax: '', sort: 'newest' };

export function filterTracks(tracks, filters) {
    const query = filters.query.trim().toLocaleLowerCase();
    const result = tracks.filter((track) => {
        const searchable = [track.title, track.artist, track.releaseTitle].join(' ').toLocaleLowerCase();
        return (!query || searchable.includes(query))
            && (!filters.type || track.type === filters.type)
            && (!filters.genre || track.genre === filters.genre)
            && (!filters.release || track.releaseTitle === filters.release)
            && (filters.bpmMin === '' || (track.bpm != null && track.bpm >= Number(filters.bpmMin)))
            && (filters.bpmMax === '' || (track.bpm != null && track.bpm <= Number(filters.bpmMax)));
    });
    const date = (track) => Date.parse(track.releaseDate || track.createdAt || '') || 0;
    return result.sort((a, b) => {
        if (filters.sort === 'title') return a.title.localeCompare(b.title);
        if (filters.sort === 'bpm-asc' || filters.sort === 'bpm-desc') {
            if (a.bpm == null) return b.bpm == null ? 0 : 1;
            if (b.bpm == null) return -1;
            return filters.sort === 'bpm-asc' ? a.bpm - b.bpm : b.bpm - a.bpm;
        }
        return filters.sort === 'oldest' ? date(a) - date(b) : date(b) - date(a);
    });
}

export function formatTime(value) {
    const seconds = Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function waveformBars(peaks, count = 100) {
    if (!Array.isArray(peaks) || !peaks.length) return [];
    const length = Math.min(peaks.length, count);
    return Array.from({ length }, (_, index) => {
        const start = Math.floor(index * peaks.length / length);
        const end = Math.max(start + 1, Math.floor((index + 1) * peaks.length / length));
        return Math.max(0, ...peaks.slice(start, end).map((value) => Math.min(1, Math.max(0, Number(value) || 0))));
    });
}
