const fs = require('node:fs/promises');
const path = require('node:path');

const publicSeo = import('../src/utils/publicSeo.js');
const NOINDEX = 'noindex, nofollow, noarchive';
const NO_CACHE = 'no-store, max-age=0';
const FALLBACK_STYLE = '<style data-muvs-document="true">#public-document-fallback{max-width:900px;margin:auto;padding:56px 24px;color:#222;line-height:1.65;font-family:system-ui,sans-serif}#public-document-fallback h1,#public-document-fallback h2{margin:0 0 20px}#public-document-fallback p,#public-document-fallback ul,#public-document-fallback nav{margin:0 0 24px}#public-document-fallback a{color:#263d10;text-decoration:underline;text-underline-offset:3px}#public-document-fallback ul{padding-left:24px}#public-document-fallback li{margin:0 0 16px}</style><noscript><style>#splash-screen{display:none!important}html,body{height:auto!important;overflow:auto!important}</style></noscript>';

function originalDocumentUrl(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.length > 4096
        || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return null;
    try {
        const url = new URL(value, 'https://muvs.dev');
        if (url.origin !== 'https://muvs.dev' || url.hash || /^\/(?:api|assets|uploads|images|videos|fonts)(?:\/|$)/i.test(url.pathname)) return null;
        return url;
    } catch { return null; }
}

function renderPublicDocument(template, page, helpers) {
    const closingHead = template.toLowerCase().indexOf('</head>');
    if (closingHead < 0 || !/<div\b[^>]*\bid=["']root["'][^>]*>\s*<\/div>/i.test(template)) throw new Error('Public document template is incomplete');
    const originalHead = template.slice(0, closingHead);
    const head = originalHead
        .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
        .replace(/<meta\b(?=[^>]*\b(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'])[^>]*>/gi, '')
        .replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi, '')
        .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
    return `${head}${helpers.renderPublicSeoHead(page)}\n${FALLBACK_STYLE}\n${template.slice(closingHead)}`
        .replace(/(<div\b[^>]*\bid=["']root["'][^>]*>)\s*(<\/div>)/i,
            (_, opening, closing) => `${opening}${helpers.renderPublicFallback(page)}${closing}`);
}

function installPublicDocuments(app, { getPublicData, distDir } = {}) {
    if (!app || typeof app.get !== 'function' || typeof getPublicData !== 'function' || !distDir) throw new TypeError('Public documents require an app, a public data getter and a built directory');
    const indexFile = path.resolve(distDir, 'index.html');
    let templatePromise;
    const getTemplate = () => {
        if (!templatePromise) templatePromise = fs.readFile(indexFile, 'utf8').catch(error => { templatePromise = null; throw error; });
        return templatePromise;
    };
    const document = async (req, res) => {
        res.set('Cache-Control', NO_CACHE);
        res.set('X-Content-Type-Options', 'nosniff');
        const original = originalDocumentUrl(req.get('X-Muvs-Document-Uri'));
        if (!original) return res.status(404).set('X-Robots-Tag', NOINDEX).type('text/plain').send('Not found');
        try {
            const helpers = await publicSeo;
            if (original.pathname === '/robots.txt') return res.type('text/plain').send(helpers.renderPublicRobots());
            const data = await getPublicData();
            if (original.pathname === '/sitemap.xml') return res.type('application/xml').send(helpers.renderPublicSitemap(data));
            const page = helpers.buildPublicSeo({ pathname: original.pathname, search: original.search, data });
            if (!page.indexable) res.set('X-Robots-Tag', NOINDEX);
            const html = renderPublicDocument(await getTemplate(), page, helpers);
            return res.status(page.status).type('text/html').send(html);
        } catch {
            return res.status(503).set('X-Robots-Tag', NOINDEX).type('text/plain').send('The site is temporarily unavailable. Please try again shortly.');
        }
    };
    app.get('/api/public-document', document);
    return { indexFile };
}

module.exports = { installPublicDocuments, originalDocumentUrl, renderPublicDocument };
