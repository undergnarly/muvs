export const PRODUCTION_STAGES = [
    { value: '', label: 'Unspecified' },
    { value: 'sketch', label: 'Sketch' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'mastered', label: 'Mastered' },
];

export function parseTrackTags(value) {
    const values = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
    const seen = new Set();
    return values.map((tag) => String(tag).trim().replace(/\s+/g, ' ')).filter((tag) => {
        const key = tag.toLowerCase();
        if (!tag || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function parsePrivateRating(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 10) {
        throw new Error('Private rating must be a number from 0 to 10, or left blank.');
    }
    return number;
}

export function loudnessLabel(track) {
    if (Number.isFinite(track?.integratedLufs)) return `${track.integratedLufs.toFixed(1)} LUFS-I`;
    if (track?.loudnessStatus === 'processing') return 'Measuring loudness…';
    if (track?.loudnessStatus === 'unavailable') return 'Loudness unavailable';
    if (track?.loudnessStatus === 'error') return 'Loudness measurement failed';
    return 'Loudness not measured';
}

export function stageLabel(value) {
    return PRODUCTION_STAGES.find((stage) => stage.value === value)?.label || 'Unspecified';
}

export function activityDate(value) {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime())
        ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

export function sortAdminTracks(tracks, order, statistics = []) {
    const stats = new Map(statistics.map((track) => [track.id, track]));
    const recentFirst = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        || String(a.title || '').localeCompare(String(b.title || ''));
    return [...tracks].sort((a, b) => {
        if (order === 'downloads' || order === 'listens') {
            return (Number(stats.get(b.id)?.[order]) || 0) - (Number(stats.get(a.id)?.[order]) || 0) || recentFirst(a, b);
        }
        if (order === 'rating') {
            return (Number.isFinite(b.rating) ? b.rating : -1) - (Number.isFinite(a.rating) ? a.rating : -1) || recentFirst(a, b);
        }
        if (order === 'title') return String(a.title || '').localeCompare(String(b.title || '')) || recentFirst(a, b);
        return recentFirst(a, b);
    });
}
