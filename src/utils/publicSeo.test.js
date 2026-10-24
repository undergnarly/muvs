import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildPublicSeo, renderPublicSeoHead, renderPublicFallback, renderPublicRobots, renderPublicSitemap,
} from './publicSeo.js';

const catalog = () => ({
    siteSettings: { siteName: 'MUVS', siteDescription: 'Music & Code', socialLinks: { soundcloud: 'https://soundcloud.com/muvs', instagram: 'javascript:alert(1)' } },
    releases: [{ title: 'Veiled', slug: 'veiled', artists: 'MUVS', description: '<p>Four tracks for sound systems.</p>', coverImage: '/uploads/veiled.webp', tracks: [{ title: 'Shanti Roko' }, { title: 'Veiled' }] },
        { title: 'Hidden release', slug: 'hidden', active: false }],
    mixes: [{ title: 'Dub session', description: 'A recorded selection.', coverImage: '/uploads/mix.webp' }],
    projects: [{ title: 'AI AGENTS', description: 'Connected tools for businesses.' }],
    about: { title: 'About MUVS', content: '<p>Music producer and developer.</p>' },
});

test('canonical release and /music use the same actual active CMS record without mutating it', () => {
    const data = catalog(); const before = JSON.stringify(data);
    const release = buildPublicSeo({ pathname: '/veiled', search: '?utm_source=friend', data });
    const music = buildPublicSeo({ pathname: '/music', data });
    assert.equal(release.status, 200); assert.equal(release.indexable, true);
    assert.equal(release.canonical, 'https://muvs.dev/veiled');
    assert.equal(music.canonical, release.canonical); assert.equal(music.title, release.title);
    assert.ok(release.title.includes('Veiled')); assert.equal(release.heading, 'Veiled');
    assert.ok(release.description.includes('Four tracks')); assert.ok(release.items.some(item => item.title === 'Shanti Roko'));
    assert.equal(release.image, 'https://muvs.dev/uploads/veiled.webp');
    assert.equal(release.schema['@type'], 'MusicAlbum'); assert.equal(release.schema.numTracks, 2);
    assert.equal(JSON.stringify(data), before);
});

test('private, legacy and test pages stay unlisted with raw noindex; unknown pages are true 404 descriptors', () => {
    const data = catalog();
    for (const pathname of ['/dubplates', '/dubplates/', '/admin', '/admin/music', '/login', '/projects', '/projects/meditation', '/test', '/music-old']) {
        const page = buildPublicSeo({ pathname, data });
        assert.equal(page.status, 200, pathname); assert.equal(page.indexable, false, pathname);
        assert.ok(renderPublicSeoHead(page).includes('noindex, nofollow, noarchive'));
        assert.equal(page.schema, null);
    }
    for (const pathname of ['/missing', '/hidden', '/not/a/real/page', '/api/nope', '/admin/missing', '/projects/missing', '/login/missing', '/dubplates/missing']) {
        const page = buildPublicSeo({ pathname, data });
        assert.equal(page.status, 404); assert.equal(page.indexable, false); assert.equal(page.canonical, null);
        assert.equal(page.heading, 'Page not found');
    }
    const robots = renderPublicRobots(); const sitemap = renderPublicSitemap(data);
    assert.ok(robots.includes('Sitemap: https://muvs.dev/sitemap.xml'));
    for (const secret of ['dubplates', 'admin', 'login', 'meditation', 'music-old', 'hidden']) {
        assert.ok(!robots.includes(secret)); assert.ok(!sitemap.includes(secret));
    }
});

test('new active slugs appear immediately and reserved routes never become release URLs', () => {
    const data = catalog();
    assert.equal(buildPublicSeo({ pathname: '/new-ep', data }).status, 404);
    data.releases.push({ title: 'New EP', slug: 'new-ep', active: true, description: 'A new release.' });
    assert.equal(buildPublicSeo({ pathname: '/new-ep', data }).status, 200);
    assert.ok(renderPublicSitemap(data).includes('https://muvs.dev/new-ep'));
    data.releases.push({ title: 'admin', slug: 'admin' });
    data.releases.push({ id: 'draft-id', title: '' });
    assert.ok(!renderPublicSitemap(data).includes('/admin'));
    assert.ok(!renderPublicSitemap(data).includes('/draft-id'));
    assert.equal(buildPublicSeo({ pathname: '/draft-id', data }).status, 404);
    assert.equal(buildPublicSeo({ pathname: '/VEILED/', data }).canonical, 'https://muvs.dev/veiled');
    assert.equal(buildPublicSeo({ pathname: '/CODE/', data }).canonical, 'https://muvs.dev/code');
});

test('selected project and mix metadata use real item queries; tracking and unknown queries do not duplicate canonicals', () => {
    const data = catalog();
    const project = buildPublicSeo({ pathname: '/code', search: '?item=ai-agents&utm_source=friend', data });
    assert.equal(project.heading, 'AI AGENTS'); assert.equal(project.canonical, 'https://muvs.dev/code?item=ai-agents');
    const mix = buildPublicSeo({ pathname: '/mixes', search: '?item=dub-session', data });
    assert.equal(mix.heading, 'Dub session'); assert.ok(mix.description.includes('recorded'));
    assert.equal(buildPublicSeo({ pathname: '/code', search: '?item=missing', data }).canonical, 'https://muvs.dev/code');
});

test('head, JSON-LD and fallback escape CMS markup, quote injection and script closing without exposing private content', () => {
    const data = catalog();
    data.releases[0].title = 'Veiled "><script>alert(1)</script> & friends';
    data.releases[0].description = '<p>Real description.</p><script>alert("bad")</script>';
    data.releases[0].artists = 'MUVS </script><script>alert(2)</script>';
    data.releases[0].coverImage = 'javascript:alert(3)';
    data.adminSettings = { pin: 'DO_NOT_LEAK' };
    const page = buildPublicSeo({ pathname: '/veiled', data });
    const head = renderPublicSeoHead(page); const body = renderPublicFallback(page);
    assert.ok(!head.includes('<script>alert')); assert.ok(!body.includes('<script>'));
    assert.ok(!head.includes('javascript:')); assert.ok(!body.includes('javascript:'));
    assert.ok(!head.includes('DO_NOT_LEAK')); assert.ok(!body.includes('DO_NOT_LEAK'));
    assert.ok(head.includes('application/ld+json')); assert.ok(head.includes('rel="canonical"'));
    assert.ok(body.includes('<h1')); assert.ok(body.includes('<a href="/code"'));
    assert.ok(!body.includes('/dubplates'));
    const json = head.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
    assert.ok(json); assert.doesNotThrow(() => JSON.parse(json)); assert.ok(!json.includes('</script>'));
});

test('sitemap is bounded escaped XML containing unique current canonical pages and no fabricated lastmod', () => {
    const data = catalog();
    data.projects.push({ title: 'Web & Apps', slug: 'web-apps' });
    const sitemap = renderPublicSitemap(data);
    assert.ok(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(sitemap.includes('/code?item=web-apps'));
    assert.ok(!sitemap.includes('<lastmod>')); assert.ok(!sitemap.includes('/music</loc>'));
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
    assert.equal(new Set(urls).size, urls.length);
    assert.ok(urls.every(url => url.startsWith('https://muvs.dev/')));
});
