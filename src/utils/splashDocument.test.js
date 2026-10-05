import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import vm from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const earlyScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function boot({ missing = false, hidden = false } = {}) {
    const classes = new Set(hidden ? ['hidden'] : []);
    const timers = new Map();
    const listeners = new Map();
    const progress = { hidden: false };
    const status = { textContent: 'LOADING' };
    const retry = { hidden: true, addEventListener: (name, handler) => listeners.set(name, handler) };
    const splash = { classList: { contains: key => classes.has(key), add: key => classes.add(key) } };
    const nodes = { 'splash-screen': missing ? null : splash, 'splash-progress': progress, 'splash-status': status, 'splash-retry': retry };
    let reloads = 0;
    vm.runInNewContext(earlyScript, {
        location: { pathname: '/login', href: 'https://muvs.dev/login', reload: () => { reloads++; } },
        document: { getElementById: id => nodes[id] ?? null },
        window: { addEventListener: (name, handler, options) => listeners.set(name, { handler, options }) },
        setTimeout: (callback, delay) => { timers.set(1, { callback, delay }); return 1; },
        clearTimeout: id => timers.delete(id),
    });
    return { classes, timers, listeners, progress, status, retry, reloads: () => reloads };
}

test('chrome tag draws first and the inline lime paint is layered above it', () => {
    assert.ok(html.includes('id="splash-stamp" style="--splash-progress:12%;--splash-tag-progress:34.2857142857%;--splash-paint-progress:0%"'));
    assert.ok(html.includes('role="progressbar" aria-label="Loading MUVS"'));
    assert.ok(html.includes('aria-valuenow="12" style="--splash-progress:12%"'));
    assert.ok(html.includes('role="img" aria-label="MUVS"'));
    assert.match(html, /#splash-progress\{[^}]*z-index:2;clip-path:inset\(0 calc\(100% - var\(--splash-paint-progress,0%\)\)/);
    assert.match(html, /#splash-logo\{[^}]*z-index:1;clip-path:inset\(0 calc\(100% - var\(--splash-tag-progress/);
    assert.match(html, /#splash-progress\{--splash-paint-source:url\('data:image\/webp;base64,[A-Za-z0-9+/=]+'\);[^}]*background:var\(--splash-paint-source\) center\/contain no-repeat/);
    assert.match(html, /#splash-logo\{--splash-logo-source:url\('data:image\/webp;base64,[A-Za-z0-9+/=]+'\);[^}]*background:var\(--splash-logo-source\) center\/contain no-repeat/);
    assert.ok(!html.includes('id="splash-bar"'));
    assert.ok(!html.includes('<svg'));
    assert.ok(!html.includes('splash-brush-grain'));
    assert.match(html, /<div id="splash-reveal">\s*<div id="splash-logo"[^>]*><\/div>\s*<div id="splash-progress"[^>]*><\/div>\s*<\/div>/);
    assert.match(html, /@keyframes splash-tag-in\{from\{clip-path:inset\(0 100% 0 0\)\}/);
    assert.match(html, /@media\(prefers-reduced-motion:reduce\)[^\n]*#splash-logo,#splash-progress\{transition:none;animation:none\}/);
    assert.match(html, /#splash-screen.failed #splash-logo\{clip-path:none;transition:none;animation:none\}/);
});

test('exact supplied chrome logo and spray are inline before the app with no image fetch', () => {
    const logoStyle = html.match(/#splash-logo\{--splash-logo-source:url\('data:image\/webp;base64,([A-Za-z0-9+/=]+)'\);([^}]*)\}/);
    assert.ok(logoStyle);
    const logo = Buffer.from(logoStyle[1], 'base64');
    assert.equal(logo.length, 45552);
    assert.ok(logo.length <= 50000);
    assert.deepEqual(logo, readFileSync(new URL('../../public/images/menu/muvs-y2k-loader-v1.webp', import.meta.url)));
    assert.equal(createHash('sha256').update(logo).digest('hex'), '6cd8b87a0286ff0f6ce345ed14eaeb8bbf18d8e4c584c7ea61483d481e8466fc');
    assert.doesNotMatch(logoStyle[2], /(?:mask|filter|background:#000)/);
    const paintStyle = html.match(/#splash-progress\{--splash-paint-source:url\('data:image\/webp;base64,([A-Za-z0-9+/=]+)'\);/);
    assert.ok(paintStyle);
    assert.deepEqual(Buffer.from(paintStyle[1], 'base64'), readFileSync(new URL('../assets/splash/spray-lime-v1.webp', import.meta.url)));
    const modulePosition = html.indexOf('<script type="module"');
    assert.ok(html.indexOf(logoStyle[0]) < modulePosition);
    assert.ok(html.indexOf(paintStyle[0]) < modulePosition);
});

test('failed early bundle still exposes recovery after 18 seconds and retry reloads', () => {
    const state = boot();
    assert.equal(state.timers.get(1).delay, 18000);
    state.timers.get(1).callback();
    assert.ok(state.classes.has('failed'));
    assert.equal(state.progress.hidden, true);
    assert.equal(state.status.textContent, 'Couldn’t load. Check your connection and try again.');
    assert.equal(state.retry.hidden, false);
    assert.equal(state.retry.href, 'https://muvs.dev/login');
    let prevented = false;
    state.listeners.get('click')({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(state.reloads(), 1);
});

test('mount cancels the independent watchdog once the application owns recovery', () => {
    const state = boot();
    const mount = state.listeners.get('muvs:app-mounted');
    assert.equal(mount.options.once, true);
    mount.handler();
    assert.equal(state.timers.size, 0);
    assert.equal(state.status.textContent, 'LOADING');
});

test('removed or already hidden loading overlay cannot reappear as an error', () => {
    for (const options of [{ missing: true }, { hidden: true }]) {
        const state = boot(options);
        state.timers.get(1).callback();
        assert.equal(state.classes.has('failed'), false);
        assert.equal(state.retry.hidden, true);
        assert.equal(state.status.textContent, 'LOADING');
    }
});
