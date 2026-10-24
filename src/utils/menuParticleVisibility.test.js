import test from 'node:test';
import assert from 'node:assert/strict';
import { menuParticleVisible } from './menuParticleVisibility.js';

test('only the selected physical copy updates particles, including a seamless 56-unit wrap', () => {
    const state = { phase: 'menu', menuIndex: 7 };
    for (let index = 0; index < 12; index++) assert.equal(menuParticleVisible(index, state, 0, true), index === 7);
    state.menuIndex = 3;
    for (let index = 0; index < 12; index++) assert.equal(menuParticleVisible(index, state, 0, true), index === 3);
    state.menuIndex = 8;
    assert.equal(menuParticleVisible(8, state, 0, true), true);
    state.menuIndex = 4;
    assert.equal(menuParticleVisible(8, state, 0, true), false);
    assert.equal(menuParticleVisible(4, state, 0, true), true);
});

test('loading hidden reduced-motion SaveData and non-menu states stop legacy particle work', () => {
    const state = { phase: 'menu', menuIndex: 4 };
    assert.equal(menuParticleVisible(4, state, 0, false), false);
    for (const preference of [2, 4, 8, 12, 14]) assert.equal(menuParticleVisible(4, state, preference, true), false);
    for (const phase of ['travel', 'section', 'foreign']) assert.equal(menuParticleVisible(4, { ...state, phase }, 0, true), false);
    for (const invalid of [null, undefined, {}]) assert.equal(menuParticleVisible(4, invalid, 0, true), false);
    assert.equal(menuParticleVisible(4, state, 0, true), true);
});
