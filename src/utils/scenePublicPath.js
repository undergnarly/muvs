import { normalizePublicSlug } from './publicSeo.js';

// Reflect the selected scene without remounting the 3D world. Auxiliary scenes
// are not release permalinks; their owning router keeps its original URL.
export function scenePublicPath({ hub, phase, section, item, search = '' }) {
    if (!hub || !['menu', 'section'].includes(phase)) return null;
    const query = new URLSearchParams(search);
    query.delete('item');
    let path = '/';
    if (phase === 'section') {
        if (section === 'music') {
            const slug = normalizePublicSlug(item?.slug || item?.title);
            path = slug ? `/${encodeURIComponent(slug)}` : '/music';
        } else if (section === 'code' || section === 'mixes' || section === 'radio') {
            path = `/${section}`;
            const slug = normalizePublicSlug(item?.slug || item?.title || item?.id);
            if (slug) query.set('item', slug);
        } else if (section === 'about') path = '/about';
        else return null;
    }
    return `${path}${query.size ? `?${query}` : ''}`;
}
