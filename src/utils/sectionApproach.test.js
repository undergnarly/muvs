import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialSectionApproached, sectionApproachReducer } from './sectionApproach.js';

test('cold hub menu and foreign return defer details but direct and legacy section links do not', () => {
    assert.equal(initialSectionApproached({ hub: true, phase: 'menu' }), false);
    assert.equal(initialSectionApproached({ hub: true, phase: 'foreign' }), false);
    for (const phase of ['section', 'travel']) assert.equal(initialSectionApproached({ hub: true, phase }), true);
    assert.equal(initialSectionApproached({ hub: false, phase: 'menu' }), true);
    assert.equal(initialSectionApproached(), true);
});

test('only accepted entry opens the sticky detail latch and return/reentry never resets it', () => {
    let state = initialSectionApproached({ hub: true, phase: 'menu' });
    for (const event of ['rotate', 'foreign', 'menu', 'return']) {
        state = sectionApproachReducer(state, event); assert.equal(state, false);
    }
    state = sectionApproachReducer(state, 'enter'); assert.equal(state, true);
    for (const event of ['travel', 'section', 'return', 'menu', 'rotate', 'enter', 'section']) {
        state = sectionApproachReducer(state, event); assert.equal(state, true);
    }
    const direct = initialSectionApproached({ hub: true, phase: 'section' });
    assert.equal(sectionApproachReducer(direct, 'return'), true);
});

test('production boundary leaves eager Billboard/camera/group/menu intact and isolates deferred font suspension', () => {
    const source = readFileSync(new URL('../components/pages/HomeNewPage.jsx', import.meta.url), 'utf8');
    const section = source.slice(source.indexOf('const sectionContent = ('), source.indexOf('const ringRef = useRef'));
    const gate = section.indexOf('{sectionApproached && (');
    assert.ok(gate > 0);
    assert.ok(section.indexOf('<Billboard') < gate, 'initial cover shell/fallback remains eager');
    const details = section.slice(gate);
    assert.match(details, /<Suspense fallback=\{null\}>/);
    for (const name of ['PlatformStack', 'FloorPhotoSheets', 'FloorText', 'CodeShortDescription', 'SupportFloorText', 'PortfolioItems', 'TVScreen']) {
        assert.ok(details.includes(`<${name}`), `${name} is inside the detail gate`);
    }
    const entry = source.slice(source.indexOf('const startTravelIn = useCallback'), source.indexOf('const startForeign = useCallback'));
    assert.ok(entry.indexOf("if (!st || st.phase !== 'menu') return;") < entry.indexOf("approachSection('enter')"));
    assert.ok(entry.indexOf("approachSection('enter')") < entry.indexOf("st.phase = 'travel'"));
    assert.equal((source.match(/approachSection\(/g) || []).length, 1, 'no delayed effect or reset dispatch');
    assert.match(source, /<group ref=\{sectionRef\} rotation=\{\[0, Math\.PI, 0\]\}/);
    assert.match(source, /sectionApproached=\{sectionApproached\}/);
    assert.ok(!details.includes('<RingMenu') && !details.includes('<HubCamera'));
});
