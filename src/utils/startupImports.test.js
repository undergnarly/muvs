import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createCachedStartupImport, startAfterLoaderPaint } from './startupImports.js';

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('App import starts after loader paint alongside provider mount, never waits for the API', async () => {
    const painted = deferred(), module = deferred(); const events = [];
    const loadApp = createCachedStartupImport(() => { events.push('import'); return module.promise; });
    const started = startAfterLoaderPaint(painted.promise, { loadApp, mount: () => events.push('provider/API') });
    await Promise.resolve(); assert.deepEqual(events, []);
    painted.resolve(); await started;
    assert.deepEqual(events, ['import', 'provider/API']);
    assert.equal(loadApp(), loadApp(), 'React.lazy reuses the exact prefetched promise');
    module.resolve({ default: 'App' }); await loadApp();
    assert.deepEqual(events, ['import', 'provider/API']);
});

test('direct Dubplates entry never starts the main-site import', async () => {
    let imports = 0, mounts = 0;
    await startAfterLoaderPaint(undefined, { isLibrary: true, loadApp: () => imports++, mount: () => mounts++ });
    assert.equal(imports, 0); assert.equal(mounts, 1);
});

test('prefetched import rejections and synchronous loader errors stay handled until React consumes them', async () => {
    for (const loader of [() => Promise.reject(new Error('network')), () => { throw new Error('network'); }]) {
        const loadApp = createCachedStartupImport(loader);
        const pending = loadApp();
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.equal(loadApp(), pending);
        await assert.rejects(pending, /network/);
    }
    const loadApp = createCachedStartupImport(() => Promise.reject(new Error('network')));
    let mounted = false;
    await startAfterLoaderPaint(undefined, { loadApp, mount: () => { mounted = true; } });
    assert.equal(mounted, true, 'the HTML recovery remains reachable if the route module fails');
});

test('loader image preloads retain all approved menu posters but prioritize only the first route image', () => {
    const source = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const preload = source.match(/window\.addEventListener\('muvs:loader-painted', function \(\) \{([\s\S]*?)\}, \{ once: true \}\);/)[1];
    const posters = ['/videos/objects/music-v3-poster-q90.webp', '/videos/objects/mixes-v4-decoded-poster-q90.webp', '/videos/objects/code-v4-decoded-poster-q90.webp'];
    for (const [pathname, expected] of [['/', posters[0]], ['/mixes/', posters[1]], ['/code', posters[2]], ['/veiled', posters[0]], ['/about', '/images/menu/about-portrait-v1.webp']]) {
        const links = [];
        runInNewContext(preload, { location: { pathname }, document: { createElement: () => ({}), head: { appendChild: link => links.push(link) } } });
        for (const poster of posters) assert.ok(links.some(link => link.href === poster));
        assert.equal(links.filter(link => link.fetchPriority === 'high').length, 1);
        assert.equal(links.find(link => link.fetchPriority === 'high').href, expected);
        for (const link of links) {
            assert.equal(link.rel, 'preload'); assert.equal(link.as, 'image'); assert.equal(link.crossOrigin, 'anonymous');
            if (link.href !== expected) assert.equal(link.fetchPriority, 'low');
        }
    }
});

test('fallback Music Mixes Code routes remain static while optional legacy pages have local Suspense', () => {
    const source = readFileSync(new URL('../AppRoot.jsx', import.meta.url), 'utf8');
    for (const page of ['MusicPage', 'MixesPage', 'CodePage']) {
        assert.match(source, new RegExp(`import ${page} from './components/pages/${page}'`));
        assert.match(source, new RegExp(`ROUTES\\.${page.replace('Page', '').toUpperCase()}_OLD} element={<${page} />}`));
    }
    for (const page of ['AboutPage', 'NewsPage', 'CVPage', 'LecturePage', 'LectureTextPage', 'TestPage']) {
        assert.match(source, new RegExp(`const ${page} = React.lazy`));
        assert.match(source, new RegExp(`element={<Suspense fallback={<LoadingFallback />}><${page} /></Suspense>}`));
    }
});
