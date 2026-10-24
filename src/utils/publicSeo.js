export const PUBLIC_ORIGIN = 'https://muvs.dev';
export const PUBLIC_ROBOTS = 'index, follow, max-image-preview:large';
export const PRIVATE_ROBOTS = 'noindex, nofollow, noarchive';

const DEFAULT_IMAGE = '/images/menu/music2.webp';
const CORE_NAVIGATION = Object.freeze([
    { title: 'Home', url: '/' }, { title: 'Music', url: '/music' },
    { title: 'Mixes', url: '/mixes' }, { title: 'Code', url: '/code' }, { title: 'About', url: '/about' },
]);
const RESERVED = new Set(['music', 'mixes', 'code', 'about', 'news', 'cv', 'lecture', 'lecture-text',
    'admin', 'login', 'projects', 'dubplates', 'test', 'api', 'assets', 'uploads', 'images', 'videos', 'fonts',
    'home-old', 'music-old', 'mixes-old', 'code-old', 'about-old', 'news-old', 'cv-old', 'lecture-old', 'lecture-text-old']);
const LEGACY = Object.freeze({ 'home-old': '/', 'music-old': '/music', 'mixes-old': '/mixes', 'code-old': '/code',
    'about-old': '/about', 'news-old': '/news', 'cv-old': '/cv', 'lecture-old': '/lecture', 'lecture-text-old': '/lecture-text' });
const PRIVATE_PATHS = new Set(['/dubplates', '/login', '/projects', '/projects/meditation', '/admin',
    '/admin/news', '/admin/music', '/admin/dubplates', '/admin/mixes', '/admin/projects', '/admin/about', '/admin/messages', '/admin/settings']);

const string = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const hasControl = value => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
export const normalizePublicSlug = value => string(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const itemSlug = item => normalizePublicSlug(item.slug || item.title || item.id);
const releaseSlug = item => normalizePublicSlug(item.slug || item.title);

export function publicPlainText(value, maximum = 1600) {
    return string(value).slice(0, 24000)
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&#(x[0-9a-f]+|\d+);?/gi, (_, code) => {
            const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
            return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
        })
        .replace(/&(nbsp|amp|quot|apos|lt|gt);/gi, (_, entity) => ({ nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' })[entity.toLowerCase()])
        .replace(/\s+/g, ' ').trim().slice(0, maximum);
}

const escapeHtml = value => string(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const jsonForHtml = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
const absolute = pathname => `${PUBLIC_ORIGIN}${pathname}`;

export function safePublicUrl(value) {
    const candidate = string(value).trim();
    if (!candidate || hasControl(candidate) || (!candidate.startsWith('/') && !/^https?:\/\//i.test(candidate))) return null;
    try {
        const url = new URL(candidate, PUBLIC_ORIGIN);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}

function published(data, key) {
    return (Array.isArray(data[key]) ? data[key] : []).filter(item => item && typeof item === 'object' && item.active !== false)
        .slice(0, 1000).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

function releaseEntries(data) {
    const used = new Set();
    return published(data, 'releases').filter(item => {
        const slug = releaseSlug(item);
        if (!slug || RESERVED.has(slug) || used.has(slug)) return false;
        used.add(slug);
        return true;
    });
}

function entry(item, url) {
    return { title: publicPlainText(item.title || item.name || 'Untitled', 140),
        description: publicPlainText(item.description || item.fullDescription || item.content, 700), url };
}

const cleanImage = value => safePublicUrl(value) || absolute(DEFAULT_IMAGE);

export function buildPublicSeo({ pathname = '/', search = '', data = {} } = {}) {
    data = object(data);
    const settings = object(data.siteSettings);
    const brand = publicPlainText(settings.siteName, 64) || 'MUVS';
    const siteDescription = publicPlainText(settings.siteDescription, 220) || 'Music, mixes and code.';
    const navigation = CORE_NAVIGATION.map(item => ({ ...item }));
    let path;
    try { path = decodeURIComponent(string(pathname).split(/[?#]/, 1)[0]); } catch { path = ''; }
    if (path.length > 1) path = path.replace(/\/+$/, '');
    path = path.toLowerCase();
    const safePath = path.startsWith('/') && !path.startsWith('//') && !/[\s\\]/.test(path) && !hasControl(path) && path.length <= 2048;
    const result = {
        status: 200, kind: 'page', indexable: true, robots: PUBLIC_ROBOTS,
        brand, title: `${brand} — ${siteDescription}`, description: siteDescription, heading: brand,
        canonical: absolute('/'), image: cleanImage(settings.socialImage || settings.ogImage || DEFAULT_IMAGE),
        paragraphs: [siteDescription], items: [], navigation, links: [], schema: null,
    };
    const makePrivate = (heading, kind = 'private') => ({ ...result, kind, heading, title: `${heading} — ${brand}`,
        description: heading, paragraphs: [], indexable: false, robots: PRIVATE_ROBOTS, canonical: null, image: null, schema: null });
    const notFound = () => ({ ...makePrivate('Page not found', 'notFound'), status: 404,
        description: 'This page is not available.', paragraphs: ['This page is not available. Use the site navigation to find music, mixes and projects.'] });
    if (!safePath) return notFound();
    if (/^\/(?:admin|login|projects|dubplates)(?:\/|$)/i.test(path)) {
        if (!PRIVATE_PATHS.has(path)) return notFound();
        return makePrivate(/^\/dubplates/i.test(path) ? 'Dubplates' : /^\/projects/i.test(path) ? 'Projects' : 'Admin access');
    }
    if (path === '/test' || Object.hasOwn(LEGACY, path.slice(1))) {
        const legacy = makePrivate(path === '/test' ? 'Preview' : 'Earlier site view', 'legacy');
        legacy.canonical = path === '/test' ? null : absolute(LEGACY[path.slice(1)]);
        return legacy;
    }

    const releases = releaseEntries(data);
    const mixes = published(data, 'mixes');
    const projects = published(data, 'projects');
    const socialUrls = Object.values(object(settings.socialLinks)).map(safePublicUrl).filter(Boolean);
    const website = { '@type': 'WebSite', '@id': absolute('/#website'), name: brand, url: absolute('/') };
    const creator = { '@type': 'Person', '@id': absolute('/#creator'), name: brand, url: absolute('/about'), ...(socialUrls.length ? { sameAs: [...new Set(socialUrls)] } : {}) };
    const selectedRelease = path === '/music' ? releases[0] : releases.find(item => `/${releaseSlug(item)}` === path);
    if (selectedRelease) {
        const release = selectedRelease;
        const releaseTitle = publicPlainText(release.title, 140) || 'Untitled release';
        const artist = publicPlainText(release.artists, 120) || brand;
        const description = publicPlainText(release.description || release.fullDescription, 1600);
        const tracks = (Array.isArray(release.tracks) ? release.tracks : []).slice(0, 200).filter(track => track && typeof track === 'object');
        Object.assign(result, { kind: 'release', heading: releaseTitle, title: `${releaseTitle} — ${artist}`,
            description: (description || `${releaseTitle} by ${artist}.`).slice(0, 220), paragraphs: description ? [description] : [`${releaseTitle} by ${artist}.`],
            canonical: absolute(`/${releaseSlug(release)}`), image: cleanImage(release.coverImage),
            items: tracks.map(track => ({ title: publicPlainText(track.title || track.name || 'Untitled track', 140), description: '', url: null })) });
        for (const [field, label] of [['spotifyUrl', 'Spotify'], ['soundcloudUrl', 'SoundCloud'], ['bandcampUrl', 'Bandcamp'], ['youtubeUrl', 'YouTube']]) {
            const url = safePublicUrl(release[field]);
            if (url) result.links.push({ title: `Listen on ${label}`, url });
        }
        result.schema = { '@context': 'https://schema.org', '@type': 'MusicAlbum', name: releaseTitle,
            url: result.canonical, description: result.description, image: result.image,
            byArtist: { '@type': 'Person', name: artist }, ...(tracks.length ? { numTracks: tracks.length,
                track: result.items.map(track => ({ '@type': 'MusicRecording', name: track.title, byArtist: { '@type': 'Person', name: artist } })) } : {}) };
        return result;
    }

    if (path === '/') {
        result.items = releases.map(item => entry(item, `/${releaseSlug(item)}`));
    } else if (path === '/music') {
        Object.assign(result, { heading: 'Music', title: `Music — ${brand}`, canonical: absolute('/music'), paragraphs: [] });
    } else if (path === '/code' || path === '/mixes') {
        const isCode = path === '/code';
        const items = isCode ? projects : mixes;
        const requested = new URLSearchParams(string(search)).get('item');
        const selected = requested ? items.find(item => itemSlug(item) === normalizePublicSlug(requested)) : null;
        const heading = selected ? publicPlainText(selected.title, 140) : isCode ? 'Code' : 'Mixes';
        const description = selected ? publicPlainText(selected.description || selected.fullDescription, 1600) : '';
        Object.assign(result, { kind: selected ? 'item' : 'collection', heading, title: `${heading} — ${brand}`,
            canonical: absolute(path + (selected ? `?item=${encodeURIComponent(itemSlug(selected))}` : '')),
            image: cleanImage(selected?.coverImage || selected?.thumbnail || (isCode ? '/images/menu/code2.webp' : '/images/menu/mixes-trans.webp')),
            description: (description || `${heading} by ${brand}.`).slice(0, 220), paragraphs: description ? [description] : [],
            items: selected ? [] : items.map(item => entry(item, `${path}?item=${encodeURIComponent(itemSlug(item))}`)) });
    } else if (path === '/about') {
        const about = object(data.about);
        const heading = publicPlainText(about.title, 140) || `About ${brand}`;
        const description = publicPlainText(about.content, 2000);
        Object.assign(result, { heading, title: `About — ${brand}`, canonical: absolute('/about'), image: cleanImage(about.backgroundImage),
            description: (description || `About ${brand}.`).slice(0, 220), paragraphs: description ? [description] : [] });
    } else if (['/news', '/cv', '/lecture', '/lecture-text'].includes(path)) {
        const heading = { '/news': 'News', '/cv': 'CV', '/lecture': 'Lecture', '/lecture-text': 'Lecture notes' }[path];
        Object.assign(result, { kind: 'auxiliary', heading, title: `${heading} — ${brand}`, canonical: absolute(path),
            description: `${heading} — ${brand}.`, paragraphs: [], indexable: false, robots: PRIVATE_ROBOTS });
        if (path === '/news') result.items = published(data, 'news').map(item => entry(item, null));
    } else return notFound();

    if (result.indexable) result.schema = { '@context': 'https://schema.org', '@type': path === '/about' ? 'AboutPage' : 'WebPage',
        name: result.title, description: result.description, url: result.canonical, isPartOf: website, about: creator,
        ...(result.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: result.image } } : {}) };
    return result;
}

export function renderPublicSeoHead(page) {
    const meta = (name, content, property = false) => `<meta ${property ? 'property' : 'name'}="${escapeHtml(name)}" content="${escapeHtml(content)}" data-muvs-seo="true" />`;
    const tags = [`<title>${escapeHtml(page.title)}</title>`, meta('description', page.description), meta('robots', page.robots)];
    if (page.canonical) tags.push(`<link rel="canonical" href="${escapeHtml(page.canonical)}" data-muvs-seo="true" />`);
    if (page.indexable) {
        for (const [name, content] of Object.entries({ 'og:type': page.kind === 'release' ? 'music.album' : 'website', 'og:site_name': page.brand,
            'og:title': page.title, 'og:description': page.description, 'og:url': page.canonical, 'og:image': page.image,
            'og:image:alt': page.heading })) if (content) tags.push(meta(name, content, true));
        for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': page.title,
            'twitter:description': page.description, 'twitter:image': page.image, 'twitter:image:alt': page.heading })) if (content) tags.push(meta(name, content));
    }
    if (page.schema) tags.push(`<script type="application/ld+json" data-muvs-seo="true">${jsonForHtml(page.schema)}</script>`);
    return tags.join('\n');
}

export function renderPublicFallback(page) {
    const link = item => `<a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>`;
    const paragraphs = page.paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
    const items = page.items.length ? `<section aria-label="${page.kind === 'release' ? 'Tracks' : 'Published work'}"><h2>${page.kind === 'release' ? 'Tracks' : 'Published work'}</h2><ul>${page.items.map(item => `<li>${item.url ? link(item) : escapeHtml(item.title)}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</li>`).join('')}</ul></section>` : '';
    const links = page.links.length ? `<nav aria-label="Listen">${page.links.map(link).join(' · ')}</nav>` : '';
    return `<main id="public-document-fallback" aria-labelledby="public-document-heading"><h1 id="public-document-heading">${escapeHtml(page.heading)}</h1>${paragraphs}${items}${links}<nav aria-label="Site navigation">${page.navigation.map(link).join(' · ')}</nav></main>`;
}

export function renderPublicRobots() {
    return `User-agent: *\nAllow: /\nSitemap: ${PUBLIC_ORIGIN}/sitemap.xml\n`;
}

export function renderPublicSitemap(data = {}) {
    data = object(data);
    const releases = releaseEntries(data);
    const paths = ['/', '/mixes', '/code', '/about', ...(releases.length ? releases.map(item => `/${releaseSlug(item)}`) : ['/music'])];
    for (const key of ['mixes', 'projects']) for (const item of published(data, key)) {
        const slug = itemSlug(item);
        if (slug) paths.push(`/${key === 'projects' ? 'code' : 'mixes'}?item=${encodeURIComponent(slug)}`);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...new Set(paths)].map(path => `<url><loc>${escapeHtml(absolute(path))}</loc></url>`).join('\n')}\n</urlset>\n`;
}
