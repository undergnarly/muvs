import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RADIO_MENU_CAPTION, RADIO_STATIONS } from './radio.js';

test('three immutable radio eras have unique release-compatible identities in listening order', () => {
    assert.ok(Object.isFrozen(RADIO_STATIONS));
    assert.deepEqual(RADIO_STATIONS.map(station => station.slug), ['roots', 'y2k', 'new-era']);
    assert.deepEqual(RADIO_STATIONS.map(station => station.order), [0, 1, 2]);
    assert.deepEqual(RADIO_STATIONS.map(station => station.artists), ['1970s–1980s', '1990s–2000s', '2015–NOW']);
    assert.equal(new Set(RADIO_STATIONS.map(station => station.id)).size, 3);
    for (const station of RADIO_STATIONS) {
        assert.ok(Object.isFrozen(station));
        assert.ok(Object.isFrozen(station.genres));
        assert.ok(Object.isFrozen(station.tracks));
        assert.match(station.id, /^radio-/);
        assert.equal(station.active, true);
        assert.equal(station.era, station.artists);
        assert.equal(station.coverImage, {
            roots: '/images/radio/radio-oldschool-v1.webp',
            y2k: '/images/radio/radio-y2k-v1.webp',
            'new-era': '/images/radio/radio-modern-v2.webp',
        }[station.slug]);
        assert.ok(station.genres.length >= 2);
    }
});

test('every radio is honestly unavailable without a stream URL, tracks or playback side effect', () => {
    assert.match(RADIO_MENU_CAPTION, /Three eras\. One frequency\./);
    assert.match(RADIO_MENU_CAPTION, /Coming soon\./);
    for (const station of RADIO_STATIONS) {
        assert.equal(station.status, 'coming-soon');
        assert.equal(station.streamUrl, null);
        assert.deepEqual(station.tracks, []);
        assert.match(station.description, /Coming soon\./);
    }
    const source = readFileSync(new URL('./radio.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /fetch\s*\(|new\s+(?:Audio|AudioContext|WebSocket)\s*\(|https?:\/\//);
});

test('canonical radio route and scene ownership are connected before the catch-all release route', () => {
    const app = readFileSync(new URL('../AppRoot.jsx', import.meta.url), 'utf8');
    const constants = readFileSync(new URL('../utils/constants.js', import.meta.url), 'utf8');
    assert.match(constants, /RADIO: '\/radio'/);
    assert.match(app, /RadioHubPage.*from '\.\/components\/pages\/HomeNewPage'/);
    assert.match(app, /const scene3DPaths = \[[\s\S]*?ROUTES\.RADIO/);
    const route = app.indexOf('<Route path={ROUTES.RADIO} element={<RadioHubPage />} />');
    assert.ok(route >= 0 && route < app.indexOf('<Route path="/:releaseSlug"'));
});

test('header navigation and optional admin caption reuse curated radio records without replacing CMS settings', () => {
    const menu = readFileSync(new URL('../components/layout/StaggeredMenu.jsx', import.meta.url), 'utf8');
    const settings = readFileSync(new URL('../components/admin/AdminSettings.jsx', import.meta.url), 'utf8');
    assert.match(menu, /key: 'radio', label: 'RADIO', path: ROUTES\.RADIO/);
    assert.match(menu, /children: RADIO_STATIONS\.map\(/);
    assert.match(menu, /path: `\$\{ROUTES\.RADIO\}\?item=\$\{station\.slug\}`/);
    assert.match(menu, /href=\{it\.path\}/, 'existing crawlable real anchors remain intact');
    assert.match(menu, /inert=\{!open \|\| !expanded\}/, 'collapsed eras stay outside the focus trap');
    assert.match(settings, /radio: RADIO_MENU_CAPTION/);
    assert.match(settings, /\{ key: 'radio', label: 'Radio' \}/);
    assert.match(settings, /menuCaptions: \{ \.\.\.MENU_CAPTION_DEFAULTS, \.\.\.\(siteSettings\?\.menuCaptions \|\| \{\}\) \}/);
    assert.match(settings, /const nextSettings = \{ \.\.\.siteSettings, \.\.\.siteFormData \}/);
});

test('Radio uses its own one-stop scene, a genuinely disabled future Play and no accidental album player', () => {
    const scene = readFileSync(new URL('../components/pages/HomeNewPage.jsx', import.meta.url), 'utf8');
    assert.match(scene, /export const RadioHubPage = \(\) => <HubSectionPage initialKey="radio"/);
    assert.match(scene, /activeStopCount = hub && activeKey === 'radio' \? 1/);
    assert.match(scene, /radio: \{\s*items: RADIO_STATIONS,\s*simple: true,\s*tvMixes: null/);
    assert.match(scene, /bottomAction: \{ label: 'COMING SOON', disabled: true \}/);
    assert.match(scene, /className="hn-action-pill" onClick=\{onClick\} disabled=\{disabled\}/);
    assert.match(scene, /!activeSection\.simple && currentRelease && sectionControls/);
    assert.match(scene, /cfgContext === 'radio' \? hydrateCfg\(DEFAULT_RADIO_CFG, stopCount\)/);
    assert.match(scene, /role="status">\{status\}/);
    assert.match(scene, /<WorldDust hubStateRef=\{hub\?\.stateRef\}/);
});
