import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { injectStartupPreloads, loaderPaintedStartupPreloads, REQUIRED_DECORATION_URLS } from '../../scripts/startup-preloads.mjs';
import { prepareMenuDecorationAssets } from './menuDecorations.js';

const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const bundle = {
    'assets/unrelated.js': { type: 'chunk', name: 'AppRoot', facadeModuleId: 'C:/other/src/Other.jsx', fileName: 'assets/unrelated.js' },
    'assets/AppRoot-hash123.js': { type: 'chunk', name: 'Anything', facadeModuleId: 'C:\\Projects\\Muvs\\src\\AppRoot.jsx', fileName: 'assets/AppRoot-hash123.js' },
};

function head(html, pathname = '/', search = '') {
    const links = [], events = new Map();
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    runInNewContext(script, { location: { pathname, search }, URLSearchParams, setTimeout: () => 1, clearTimeout() {},
        window: { addEventListener: (name, listener) => events.set(name, listener) },
        document: { addEventListener() {}, createElement: () => ({}), head: { appendChild: link => { if (link.rel) links.push(link); } } },
    });
    return { links, paint: () => events.get('muvs:loader-painted')?.() };
}

test('build resolves AppRoot by module identity and actual hash/base, not a guessed chunk name', () => {
    const html = injectStartupPreloads(source, bundle, '/');
    assert.ok(html.includes('var appRootModuleUrl = "' + '/assets/AppRoot-hash123.js"'));
    assert.ok(!html.includes('muvs:app-root-url'));
    assert.ok(!html.includes('muvs:required-decorations'));
    assert.ok(injectStartupPreloads(source, bundle, '/portfolio/').includes('"/portfolio/assets/AppRoot-hash123.js"'));
    assert.ok(injectStartupPreloads(source, bundle, 'https://cdn.example.test/site/').includes('"https://cdn.example.test/site/assets/AppRoot-hash123.js"'));
    const merged = { merged: { type: 'chunk', facadeModuleId: null, moduleIds: ['C:/Projects/Muvs/src/AppRoot.jsx'], fileName: 'assets/merged-livehash.js' } };
    assert.ok(injectStartupPreloads(source, merged).includes('"/assets/merged-livehash.js"'));
    assert.throws(() => injectStartupPreloads(source, {}, '/'), /Expected one emitted AppRoot/);
    assert.throws(() => injectStartupPreloads(source, bundle, './'), /absolute Vite base/);
    assert.throws(() => injectStartupPreloads('wrong document', bundle), /markers are missing/);
});

test('no main module/media request is added until logo+spray paint, then exactly one matching module preload', () => {
    const html = injectStartupPreloads(source, bundle);
    const harness = head(html);
    assert.deepEqual(harness.links, []);
    harness.paint();
    const modules = harness.links.filter(link => link.rel === 'modulepreload');
    assert.equal(modules.length, 1);
    assert.equal(modules[0].href, '/assets/AppRoot-hash123.js');
    assert.equal(modules[0].crossOrigin, '', 'same anonymous credentials as Vite dynamic imports/polyfill');
    assert.equal(modules[0].fetchPriority, 'high');
    const images = harness.links.filter(link => link.rel === 'preload');
    assert.equal(images.filter(link => link.fetchPriority === 'high').length, 1, 'only the route hero competes with main JS');
    assert.ok(harness.links.every(link => link.rel === 'modulepreload' || link.as === 'image'), 'never preloads videos or new 3D libraries');
});

test('early low-priority decoration URLs match exactly the existing six readiness textures', async () => {
    const required = [];
    await prepareMenuDecorationAssets(src => { required.push(src); return Promise.resolve({}); });
    assert.equal(REQUIRED_DECORATION_URLS.length, 6);
    assert.deepEqual([...REQUIRED_DECORATION_URLS].sort(), required.sort());
    const harness = head(injectStartupPreloads(source, bundle)); harness.paint();
    const decorations = harness.links.filter(link => REQUIRED_DECORATION_URLS.includes(link.href));
    assert.deepEqual(decorations.map(link => link.href), [...REQUIRED_DECORATION_URLS]);
    assert.ok(decorations.every(link => link.rel === 'preload' && link.as === 'image'
        && link.crossOrigin === 'anonymous' && link.fetchPriority === 'low'));
});

test('Radio warms only its own selected hero at high priority after loader paint, never on initial Music', () => {
    const html = injectStartupPreloads(source, bundle);
    for (const [query, name] of [['', 'oldschool'], ['?item=y2k', 'y2k'], ['?item=new-era', 'modern'], ['?item=unknown', 'oldschool']]) {
        const radio = head(html, '/radio', query);
        assert.deepEqual(radio.links, []);
        radio.paint();
        assert.deepEqual(radio.links.filter(link => link.as === 'image' && link.fetchPriority === 'high').map(link => link.href),
            [`/images/radio/radio-${name}-${name === 'modern' ? 'v3' : 'v2'}.webp`]);
    }
    const home = head(html); home.paint();
    assert.ok(home.links.every(link => !link.href.includes('/radio/')));
});

test('direct Dubplates/admin/login/project documents never register the main-site media/module warmup', () => {
    const html = injectStartupPreloads(source, bundle);
    for (const pathname of ['/dubplates', '/dubplates/', '/Dubplates', '/DUBPLATES/', '/admin', '/admin/settings', '/login', '/projects/meditation']) {
        const harness = head(html, pathname); harness.paint();
        assert.deepEqual(harness.links, [], pathname);
    }
});

test('generateBundle injects before the standalone noindex document is copied, without eager static links', () => {
    const plugin = loaderPaintedStartupPreloads();
    plugin.configResolved({ base: '/site/' });
    const emitted = { ...bundle, 'index.html': { type: 'asset', source } };
    plugin.generateBundle({}, emitted);
    assert.ok(String(emitted['index.html'].source).includes('"/site/assets/AppRoot-hash123.js"'));
    assert.ok(!/<link[^>]+(?:AppRoot-hash123|moss-rock)/.test(String(emitted['index.html'].source)));
});
