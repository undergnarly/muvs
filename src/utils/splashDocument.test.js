import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('loading stamp is inline, black/lime, labelled and has no old progress line', () => {
    assert.ok(html.includes('id="splash-stamp"'));
    assert.ok(html.includes('role="progressbar" aria-label="Loading MUVS"'));
    assert.ok(html.includes('aria-valuenow="12" style="--splash-progress:12%"'));
    assert.ok(html.includes('role="img" aria-label="MUVS"'));
    assert.match(html, /#splash-progress\{[^}]*color:#ccff00;[^}]*clip-path:inset\(0 calc\(100% - var\(--splash-progress/);
    assert.match(html, /#splash-logo\{--splash-logo-source:url\('data:image\/webp;base64,[A-Za-z0-9+/=]+'\);[^}]*background:#000/);
    assert.ok(!html.includes('id="splash-bar"'));
    assert.match(html, /@media\(prefers-reduced-motion:reduce\)[^\n]*#splash-progress\{transition:none\}/);
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
