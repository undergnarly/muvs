import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = html.match(/<script id="splash-grid-runtime">([\s\S]*?)<\/script>/)[1];

function bootGrid({ reduced = false, saveData = false, visibility = 'visible', random = 0, missing = false } = {}) {
    let now = 0, id = 0, observer;
    const timers = new Map(), listeners = new Map(), classes = new Set(), pulses = [];
    const screenClasses = new Set();
    const listen = (key, fn) => { if (!listeners.has(key)) listeners.set(key, new Set()); listeners.get(key).add(fn); };
    const unlisten = (key, fn) => listeners.get(key)?.delete(fn);
    const emit = key => { for (const fn of [...(listeners.get(key) ?? [])]) fn(); };
    const screen = { isConnected: true, hidden: false, classList: { contains: key => screenClasses.has(key) } };
    const grid = { classList: {
        add: key => { classes.add(key); pulses.push(now); },
        remove: key => classes.delete(key),
    } };
    const preference = { matches: reduced, addEventListener: (_, fn) => listen('preference', fn), removeEventListener: (_, fn) => unlisten('preference', fn) };
    const math = Object.create(Math);
    math.random = () => random;
    vm.runInNewContext(script, {
        Math: math, navigator: { connection: { saveData } }, performance: { now: () => now },
        document: { body: {}, get visibilityState() { return visibility; }, getElementById: name => missing ? null : name === 'splash-screen' ? screen : grid,
            addEventListener: (name, fn) => listen(name, fn), removeEventListener: (name, fn) => unlisten(name, fn) },
        window: { matchMedia: () => preference, addEventListener: (name, fn) => listen(name, fn), removeEventListener: (name, fn) => unlisten(name, fn) },
        setTimeout: (fn, delay) => { const token = ++id; timers.set(token, { fn, at: now + delay }); return token; },
        clearTimeout: token => timers.delete(token),
        MutationObserver: class {
            constructor(fn) { observer = this; this.fn = fn; this.active = true; this.targets = []; }
            observe(target, options) { this.targets.push({ target, options }); }
            disconnect() { this.active = false; }
        },
    });
    return {
        classes, pulses, timers, listeners, observer: () => observer,
        start: () => emit('muvs:loader-painted'),
        advance: delta => {
            const end = now + delta;
            while (true) {
                const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
                if (!next || next[1].at > end) break;
                now = next[1].at; timers.delete(next[0]); next[1].fn();
            }
            now = end;
        },
        hide: () => { visibility = 'hidden'; emit('visibilitychange'); },
        show: () => { visibility = 'visible'; emit('visibilitychange'); },
        reduce: () => { preference.matches = true; emit('preference'); },
        exit: () => emit('pagehide'),
        terminate: name => {
            if (name === 'removed') screen.isConnected = false;
            else if (name === 'attribute') screen.hidden = true;
            else screenClasses.add(name);
            if (observer?.active) observer.fn();
        },
    };
}

test('grid is inline, decorative, behind the unchanged logo/spray and animates only opacity for one second', () => {
    assert.match(html, /<div id="splash-plane"><div id="splash-grid" aria-hidden="true"><\/div><div id="splash-content">/);
    assert.match(html, /#splash-content\{position:relative;z-index:1;/);
    const style = html.match(/#splash-grid\{([^}]*)\}/)[1];
    assert.match(style, /pointer-events:none;opacity:0;background-image:linear-gradient/);
    assert.doesNotMatch(style, /url\(|will-change|filter:|transition:/);
    assert.match(html, /#splash-grid.pulsing\{animation:splash-grid-pulse 1s both\}/);
    const keyframes = html.match(/@keyframes splash-grid-pulse\{([^\n]*)\}/)[1];
    assert.doesNotMatch(keyframes, /transform|width|height|background|filter/);
    assert.match(html, /#splash-screen.departing #splash-grid,#splash-screen.failed #splash-grid\{display:none\}/);
    assert.match(html, /@media\(prefers-reduced-motion:reduce\)\{#splash-grid\{display:none\}\}/);
    assert.ok(html.indexOf('id="splash-grid-runtime"') < html.indexOf('<script type="module"'));
});

test('first mesh appears only after inline assets paint and after the initial tag/spray intro', () => {
    const state = bootGrid();
    state.advance(20000); assert.equal(state.pulses.length, 0);
    state.start(); state.advance(1749); assert.equal(state.pulses.length, 0);
    state.advance(1); assert.equal(state.classes.has('pulsing'), true);
    state.advance(999); assert.equal(state.classes.has('pulsing'), true);
    state.advance(1); assert.equal(state.classes.has('pulsing'), false);
});

test('randomized pulses have at least eight completely quiet seconds between them, with only one timer', () => {
    const starts = [];
    for (const random of [0, 0.5, 0.999]) {
        const state = bootGrid({ random }); state.start();
        assert.equal(state.timers.size, 1);
        state.advance(70000);
        starts.push(state.pulses[0]);
        for (let i = 1; i < state.pulses.length; i++) assert.ok(state.pulses[i] - state.pulses[i - 1] >= 9000);
        assert.equal(state.timers.size, 1);
    }
    assert.equal(new Set(starts).size, 3);
});

test('departure, failure, hidden overlay, hidden attribute and removal clear active and pending pulses and all listeners', () => {
    for (const name of ['departing', 'failed', 'hidden', 'attribute', 'removed']) {
        for (const active of [false, true]) {
            const state = bootGrid(); state.start(); if (active) state.advance(1900);
            state.terminate(name);
            assert.equal(state.classes.has('pulsing'), false);
            assert.equal(state.timers.size, 0); assert.equal(state.observer().active, false);
            assert.ok([...state.listeners.values()].every(listeners => listeners.size === 0));
            const count = state.pulses.length; state.advance(50000); assert.equal(state.pulses.length, count);
        }
    }
});

test('hiding during a pulse cancels it and resuming waits a full quiet gap without catch-up flashes', () => {
    const state = bootGrid(); state.start(); state.advance(1900);
    state.hide(); assert.equal(state.classes.has('pulsing'), false); assert.equal(state.timers.size, 0);
    state.advance(60000); state.show(); state.advance(7999); assert.equal(state.pulses.length, 1);
    state.advance(1); assert.equal(state.pulses.length, 2);
});

test('hidden initial tab and pending gap preserve remaining visible wait', () => {
    const state = bootGrid({ visibility: 'hidden' }); state.start(); state.advance(60000);
    assert.equal(state.timers.size, 0); state.show(); state.advance(1000); state.hide();
    state.advance(60000); state.show(); state.advance(749); assert.equal(state.pulses.length, 0);
    state.advance(1); assert.equal(state.pulses.length, 1);
});

test('motion/data preferences or absent overlay do not install timers/observers and a later reduced preference cleans up', () => {
    for (const options of [{ reduced: true }, { saveData: true }, { missing: true }]) {
        const state = bootGrid(options); state.start(); state.advance(60000);
        assert.equal(state.pulses.length, 0); assert.equal(state.timers.size, 0); assert.equal(state.observer(), undefined);
    }
    const state = bootGrid(); state.start(); state.advance(1900); state.reduce();
    assert.equal(state.classes.has('pulsing'), false); assert.equal(state.timers.size, 0);
    assert.equal(state.observer().active, false);
});

test('page exit cleans up and completion before assets paint cannot restart the mesh', () => {
    for (const end of [state => state.exit(), state => state.terminate('departing')]) {
        const state = bootGrid(); end(state); state.start(); state.advance(60000);
        assert.equal(state.pulses.length, 0); assert.equal(state.timers.size, 0);
        assert.equal(state.observer().active, false);
    }
});
