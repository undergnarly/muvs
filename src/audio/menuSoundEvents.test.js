import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dispatchMenuSoundNavigation, MENU_SOUND_NAVIGATION_EVENT, menuSoundControlState, readMenuSoundPreference, saveMenuSoundPreference } from './menuSoundEvents.js';

test('accepted navigation carries exact motion ID and target section, bounded direction and no replay store', () => {
    const events = [];
    const target = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent: event => events.push(event) };
    assert.equal(dispatchMenuSoundNavigation({ id: 3, section: 'mixes', direction: -4 }, target), true);
    assert.equal(events[0].type, MENU_SOUND_NAVIGATION_EVENT);
    assert.deepEqual(events[0].detail, { id: 3, section: 'mixes', direction: -1 });
    for (const data of [{ section: 'code' }, { id: NaN, section: 'code' }, { id: 4, section: 'admin' }]) assert.equal(dispatchMenuSoundNavigation(data, target), false);
    assert.equal(dispatchMenuSoundNavigation({ id: 4, section: 'code' }, null), false);
    assert.equal(events.length, 1);
});

test('radio navigation is accepted by key without changing existing section identities', () => {
    const events = [];
    const target = { CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, dispatchEvent: event => events.push(event) };
    for (const [id, section] of ['music', 'mixes', 'code', 'about', 'radio'].entries()) {
        assert.equal(dispatchMenuSoundNavigation({ id, section, direction: 3 }, target), true);
        assert.deepEqual(events.at(-1).detail, { id, section, direction: 1 });
    }
    assert.equal(events.length, 5);
});

test('remembered preference is optional storage, not browser permission or an automatic start', () => {
    const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
    assert.equal(readMenuSoundPreference(storage), false);
    saveMenuSoundPreference(true, storage);
    assert.equal(readMenuSoundPreference(storage), true);
    assert.equal(menuSoundControlState({ status: 'off' }, true).pressed, false);
    assert.equal(menuSoundControlState({ status: 'off' }, true).text, 'Enable sound');
    saveMenuSoundPreference(false, storage);
    assert.equal(readMenuSoundPreference(storage), false);
    const unavailable = { getItem() { throw Error(); }, setItem() { throw Error(); } };
    assert.equal(readMenuSoundPreference(unavailable), false);
    assert.doesNotThrow(() => saveMenuSoundPreference(true, unavailable));
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
        Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Storage denied'); } });
        assert.equal(readMenuSoundPreference(), false);
        assert.doesNotThrow(() => saveMenuSoundPreference(true));
    } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else delete globalThis.localStorage;
    }
});

test('button states never promise audible sound when loading, blocked, failed or unsupported', () => {
    assert.equal(menuSoundControlState({ status: 'on' }).label, 'Mute menu sound');
    for (const status of ['off', 'blocked', 'paused', 'error', 'unsupported']) assert.equal(menuSoundControlState({ status }).pressed, false);
    assert.equal(menuSoundControlState({ status: 'loading' }).label, 'Cancel sound loading');
    assert.match(menuSoundControlState({ status: 'error' }).label, /Retry/);
});

test('menu integration is opt-in, loader/player gated, keyboard native and does not consume film handoff', () => {
    const component = readFileSync(new URL('../components/media/MenuSound.jsx', import.meta.url), 'utf8');
    assert.match(component, /<button type="button"/);
    assert.match(component, /engine\.enableFromGesture\(\)/);
    assert.match(component, /if \(!available\) return null/);
    assert.match(component, /!playerActive && !page\.hidden && !page\.splash && !page\.overlay/);
    assert.match(component, /FILM_TRANSITION_END_EVENT/);
    assert.ok(!component.includes('takeFilmTransition'));
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    assert.ok(!html.includes('/audio/menu/'), 'sound must never join critical loader preloads');
    const scene = readFileSync(new URL('../components/pages/HomeNewPage.jsx', import.meta.url), 'utf8');
    assert.match(scene, /\{hub && <MenuSound active=\{hubPhase === 'menu'\}/);
    assert.match(scene, /playerActive=\{sectionControls \|\| mixPlaying\}/);
    assert.ok(scene.includes('.menu-sound-control, input'));
    const rotate = scene.slice(scene.indexOf('const hubRotateBy = useCallback'), scene.indexOf('const hubRotateByButton'));
    assert.ok(rotate.indexOf('if (!st') < rotate.indexOf('dispatchMenuSoundNavigation'));
    assert.ok(rotate.indexOf('dispatchMenuSoundNavigation') < rotate.indexOf('st.menuIndex += d'));
});
