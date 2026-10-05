import test from 'node:test';
import assert from 'node:assert/strict';
import { updateSplashProgress } from './splashProgress.js';

function splash({ css = '12%', aria = '12' } = {}) {
    const properties = new Map([['--splash-progress', css]]);
    const attributes = new Map([['aria-valuenow', aria]]);
    const element = {
        style: {
            getPropertyValue: (name) => properties.get(name) ?? '',
            setProperty: (name, value) => properties.set(name, value),
        },
        getAttribute: (name) => attributes.get(name) ?? null,
        setAttribute: (name, value) => attributes.set(name, value),
    };
    return {
        doc: { getElementById: (id) => id === 'splash-progress' ? element : null },
        css: () => properties.get('--splash-progress'),
        aria: () => attributes.get('aria-valuenow'),
    };
}

test('initial inline paint mark is retained and visual/ARIA progress stay synchronized', () => {
    const state = splash();
    assert.equal(updateSplashProgress(0, state.doc), 12);
    assert.equal(state.css(), '12%');
    assert.equal(state.aria(), '12');
    assert.equal(updateSplashProgress(25, state.doc), 25);
    assert.equal(state.css(), '25%');
    assert.equal(state.aria(), '25');
});

test('out-of-order media preparation and late updates cannot regress completed progress', () => {
    const state = splash();
    const results = [65, 25, 90, 100, 65, 90].map((value) => updateSplashProgress(value, state.doc));
    assert.deepEqual(results, [65, 65, 90, 100, 100, 100]);
    assert.equal(state.css(), '100%');
    assert.equal(state.aria(), '100');
});

test('both existing inline CSS and ARIA values protect against regression', () => {
    for (const existing of [{ css: '80%', aria: '12' }, { css: '12%', aria: '80' }]) {
        const state = splash(existing);
        assert.equal(updateSplashProgress(65, state.doc), 80);
        assert.equal(state.css(), '80%');
        assert.equal(state.aria(), '80');
    }
});

test('invalid and negative values cannot corrupt progress; large values are capped', () => {
    const state = splash();
    for (const value of [undefined, null, NaN, Infinity, -Infinity, -30, '', 'broken', {}, true, Symbol('invalid')]) {
        assert.equal(updateSplashProgress(value, state.doc), 12);
        assert.equal(state.css(), '12%');
        assert.equal(state.aria(), '12');
    }
    assert.equal(updateSplashProgress(200, state.doc), 100);
    assert.equal(state.css(), '100%');
    assert.equal(state.aria(), '100');
});

test('invalid or out-of-range existing values are normalized', () => {
    const invalid = splash({ css: 'bad%', aria: '-20' });
    assert.equal(updateSplashProgress(25, invalid.doc), 25);
    const oversized = splash({ css: '130%', aria: '200' });
    assert.equal(updateSplashProgress(25, oversized.doc), 100);
    assert.equal(oversized.css(), '100%');
    assert.equal(oversized.aria(), '100');
});

test('numeric strings and fractional progress are safely retained', () => {
    const state = splash();
    assert.equal(updateSplashProgress(' 65.5% ', state.doc), 65.5);
    assert.equal(state.css(), '65.5%');
    assert.equal(state.aria(), '65.5');
    assert.equal(updateSplashProgress('65px', state.doc), 65.5);
});

test('a missing document or already-removed splash is a safe no-op', () => {
    assert.equal(updateSplashProgress(25, null), undefined);
    assert.equal(updateSplashProgress(100, { getElementById: () => null }), undefined);
    assert.equal(updateSplashProgress(90), undefined);
});

test('a new splash is independent of a previously completed element', () => {
    const completed = splash();
    const fresh = splash();
    updateSplashProgress(100, completed.doc);
    assert.equal(updateSplashProgress(25, fresh.doc), 25);
    assert.equal(completed.css(), '100%');
    assert.equal(fresh.css(), '25%');
});
