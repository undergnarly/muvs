import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { buildPublicSeo } from '../../utils/publicSeo';

const readableOnly = {
    position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
    overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', clipPath: 'inset(50%)', border: 0,
};
const currentRoute = () => `${window.location.pathname}${window.location.search}`;
const serverRoute = () => '/';
const subscribeRoute = listener => {
    window.addEventListener('popstate', listener);
    window.addEventListener('muvs:permalink-change', listener);
    return () => {
        window.removeEventListener('popstate', listener);
        window.removeEventListener('muvs:permalink-change', listener);
    };
};

export default function PublicSeo({ data, ready = true }) {
    useLocation();
    const route = useSyncExternalStore(subscribeRoute, currentRoute, serverRoute);
    const page = useMemo(() => {
        const url = new URL(route, 'https://muvs.dev');
        return buildPublicSeo({ pathname: url.pathname, search: url.search, data });
    }, [route, data]);

    useEffect(() => {
        if (!ready) return undefined;
        const owned = [];
        document.head.querySelectorAll('[data-muvs-seo="true"],meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]').forEach(node => node.remove());
        document.title = page.title;
        const append = node => { node.dataset.muvsSeo = 'true'; document.head.appendChild(node); owned.push(node); };
        const meta = (name, content, property = false) => {
            const node = document.createElement('meta');
            node.setAttribute(property ? 'property' : 'name', name);
            node.content = content;
            append(node);
        };
        meta('description', page.description);
        meta('robots', page.robots);
        if (page.canonical) {
            const canonical = document.createElement('link');
            canonical.rel = 'canonical'; canonical.href = page.canonical; append(canonical);
        }
        if (page.indexable) {
            for (const [name, value] of Object.entries({ 'og:type': page.kind === 'release' ? 'music.album' : 'website',
                'og:site_name': page.brand, 'og:title': page.title, 'og:description': page.description,
                'og:url': page.canonical, 'og:image': page.image, 'og:image:alt': page.heading })) if (value) meta(name, value, true);
            for (const [name, value] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': page.title,
                'twitter:description': page.description, 'twitter:image': page.image, 'twitter:image:alt': page.heading })) if (value) meta(name, value);
        }
        if (page.schema) {
            const schema = document.createElement('script');
            schema.type = 'application/ld+json'; schema.textContent = JSON.stringify(page.schema); append(schema);
        }
        return () => { for (const node of owned) node.remove(); };
    }, [page, ready]);

    if (!ready || ['private', 'legacy', 'notFound'].includes(page.kind)) return null;
    return <main id="public-page-information" aria-labelledby="public-page-heading" style={readableOnly}>
        <h1 id="public-page-heading">{page.heading}</h1>
        {page.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {page.items.length > 0 && <section aria-label={page.kind === 'release' ? 'Tracks' : 'Published work'}>
            <h2>{page.kind === 'release' ? 'Tracks' : 'Published work'}</h2>
            <ul>{page.items.map((item, index) => <li key={`${item.url || item.title}:${index}`}>
                {item.url ? <a href={item.url} tabIndex={-1}>{item.title}</a> : item.title}
                {item.description && <p>{item.description}</p>}
            </li>)}</ul>
        </section>}
        {page.links.length > 0 && <nav aria-label="Listen">{page.links.map(link => <a key={link.url} href={link.url} tabIndex={-1}>{link.title}</a>)}</nav>}
        <nav aria-label="Site navigation">{page.navigation.map(link => <a key={link.url} href={link.url} tabIndex={-1}>{link.title}</a>)}</nav>
    </main>;
}
