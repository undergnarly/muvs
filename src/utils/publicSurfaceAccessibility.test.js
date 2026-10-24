import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isPlainMenuClick, menuFocusables, menuTabTarget } from './menuAccessibility.js';
import { configuredContactLinks } from './configuredContactLinks.js';

test('menu navigation preserves modified middle and already handled browser clicks', () => {
    assert.equal(isPlainMenuClick({ button: 0 }), true);
    assert.equal(isPlainMenuClick({}), true, 'keyboard activation has no required mouse button');
    for (const change of [{ button: 1 }, { button: 2 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) {
        assert.equal(isPlainMenuClick({ button: 0, ...change }), false);
    }
});

test('menu keyboard boundaries wrap both ways and recover focus that escaped the panel', () => {
    const first = {}, middle = {}, last = {}, outside = {};
    const controls = [first, middle, last];
    assert.equal(menuTabTarget(controls, last, false), first);
    assert.equal(menuTabTarget(controls, first, true), last);
    assert.equal(menuTabTarget(controls, outside, false), first);
    assert.equal(menuTabTarget(controls, outside, true), last);
    assert.equal(menuTabTarget(controls, middle, false), null);
    assert.equal(menuTabTarget([], outside, false), null);
});

test('collapsed inert hidden disabled and tabindex-minus-one links never enter the focus trap', () => {
    const element = (change = {}) => ({ disabled: false, tabIndex: 0, closest: () => null, getClientRects: () => [1], ...change });
    const active = element();
    const root = { querySelectorAll: () => [active, element({ disabled: true }), element({ tabIndex: -1 }), element({ closest: () => ({}) }), element({ getClientRects: () => [] })] };
    assert.deepEqual(menuFocusables(root), [active]);
    assert.deepEqual(menuFocusables(null), []);
});

test('legacy contact offers only actual configured public channels without inventing an address', () => {
    assert.deepEqual(configuredContactLinks({}), []);
    const settings = { socialLinks: { telegram: 'https://t.me/configured-owner', instagram: 'https://instagram.com/configured-owner', email: 'invented@example.invalid' } };
    const links = configuredContactLinks(settings);
    assert.deepEqual(links.map(link => link.href), [settings.socialLinks.telegram, settings.socialLinks.instagram]);
    assert.equal(links[0].label, 'Telegram');
    assert.equal(settings.socialLinks.email, 'invented@example.invalid');
    for (const unsafe of ['javascript:alert(1)', 'data:text/html,test', '//example.invalid', '/admin', 'https://user:pass@example.invalid', 'https://bad\n.invalid', false, {}]) {
        assert.deepEqual(configuredContactLinks({ socialLinks: { telegram: unsafe } }), []);
    }
});

test('production menu and login source preserve crawlable links and accessible state associations', () => {
    const menu = readFileSync(new URL('../components/layout/StaggeredMenu.jsx', import.meta.url), 'utf8');
    assert.match(menu, /inert=\{!open\}/);
    assert.match(menu, /aria-controls=\{panelId\}/);
    assert.match(menu, /href=\{it\.path\}/);
    assert.match(menu, /inert=\{!open \|\| !expanded\}/);
    assert.match(menu, /height: expanded \? 'auto' : 0/);
    assert.doesNotMatch(menu, /\{expanded && \(/, 'collapsed child anchors stay in the DOM');
    const login = readFileSync(new URL('../components/admin/LoginPage.jsx', import.meta.url), 'utf8');
    assert.match(login, /htmlFor=\{passwordId\}/);
    assert.match(login, /autoComplete="current-password"/);
    assert.match(login, /aria-invalid=/);
    assert.match(login, /aria-describedby=/);
    assert.match(login, /role="alert"/);
    const contact = readFileSync(new URL('../components/forms/ContactForm.jsx', import.meta.url), 'utf8');
    assert.match(contact, /configuredContactLinks\(siteSettings\)/);
    assert.doesNotMatch(contact, /addMessage|setTimeout|fetch\(|<form|sent successfully/i);
});

test('the actual album player has keyboard seeking native row buttons and an inert collapsed playlist', () => {
    const source = readFileSync(new URL('../components/media/AlbumPlayer.jsx', import.meta.url), 'utf8');
    assert.match(source, /import \{ keyboardSeek \}/);
    assert.match(source, /tabIndex=\{0\}/);
    assert.match(source, /onKeyDown=\{seekKey\}/);
    assert.match(source, /aria-valuetext=/);
    assert.match(source, /inert=\{collapsed\}/);
    assert.doesNotMatch(source, /role="listbox"|role="option"/);
    assert.match(source, /<button\s+type="button"\s+className=\{`ap-row/);
});
