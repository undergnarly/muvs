export function isSceneFilmTransition(previous, next) {
    if (!previous || !next) return false;
    if ((next.phase === 'travel' || next.phase === 'foreign') && previous.phase !== next.phase) return true;
    if (next.phase === 'menu' && previous.phase === 'menu') return previous.ringIndex !== next.ringIndex;
    if (next.phase !== 'section' || previous.phase !== 'section') return false;
    return ['activeKey', 'stop', 'release', 'mix'].some((key) => previous[key] !== next[key]);
}

// Match the router's accepted trailing slash/case variants so each public
// scene owns exactly one overlay, including published release permalinks.
export const normalizeSceneFilmPath = pathname => String(pathname || '/').replace(/\/+$/, '').toLowerCase() || '/';

export function isSceneFilmRoute(pathname, releases = []) {
    const path = normalizeSceneFilmPath(pathname);
    if (['/', '/music', '/mixes', '/code', '/about', '/radio'].includes(path)) return true;
    if (path.slice(1).includes('/')) return false;
    const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return releases.some(release => release.active !== false && slug(release.slug || release.title) === slug(path.slice(1)));
}
