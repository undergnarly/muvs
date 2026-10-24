import { MENU_DECORATION_ASSETS } from '../src/data/menuDecorAssets.js';

const MODULE_MARKER = '/* muvs:app-root-url */ null';
const DECORATION_MARKER = '/* muvs:required-decorations */ []';
const serialize = value => JSON.stringify(value).replace(/</g, '\\u003c');

// Exactly the existing menuStartup readiness gate: five rocks and one brace.
// Mixes' cassette/vinyl models need no image textures and add no requests here.
export const REQUIRED_DECORATION_URLS = Object.freeze([
    ...MENU_DECORATION_ASSETS.music, ...MENU_DECORATION_ASSETS.code,
].map(asset => asset.src));

export function injectStartupPreloads(html, bundle, base = '/') {
    const isAppRoot = id => typeof id === 'string'
        && id.split('?')[0].replaceAll('\\', '/').endsWith('/src/AppRoot.jsx');
    const chunks = Object.values(bundle).filter(chunk => chunk.type === 'chunk');
    const facades = chunks.filter(chunk => isAppRoot(chunk.facadeModuleId));
    // With preserveEntrySignatures:false Rollup may merge a dynamic entry's
    // facade into its implementation chunk; its exact module identity remains.
    const roots = facades.length ? facades : chunks.filter(chunk =>
        (chunk.moduleIds || Object.keys(chunk.modules || {})).some(isAppRoot));
    if (roots.length !== 1) throw new Error(`Expected one emitted AppRoot dynamic entry, found ${roots.length}.`);
    if (!html.includes(MODULE_MARKER) || !html.includes(DECORATION_MARKER)) {
        throw new Error('Loader-painted startup preload markers are missing from index.html.');
    }
    // Vite resolves base to a trailing-slash root path or absolute URL. Relative
    // bases are deliberately rejected: a permalink must not resolve /assets at
    // /music/assets when the same document is served from different routes.
    if (!base.startsWith('/') && !/^https?:\/\//i.test(base)) throw new Error('Startup preloads require an absolute Vite base.');
    const href = `${base.endsWith('/') ? base : `${base}/`}${roots[0].fileName}`;
    return html.replace(MODULE_MARKER, serialize(href))
        .replace(DECORATION_MARKER, serialize(REQUIRED_DECORATION_URLS));
}

export function loaderPaintedStartupPreloads() {
    let base = '/';
    return {
        name: 'loader-painted-startup-preloads',
        apply: 'build',
        enforce: 'post',
        configResolved(config) { base = config.base; },
        generateBundle(_options, bundle) {
            const document = bundle['index.html'];
            if (!document) return;
            document.source = injectStartupPreloads(String(document.source), bundle, base);
        },
    };
}
