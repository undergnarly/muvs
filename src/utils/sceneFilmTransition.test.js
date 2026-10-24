import test from 'node:test';
import assert from 'node:assert/strict';
import { isSceneFilmRoute, isSceneFilmTransition, normalizeSceneFilmPath } from './sceneFilmTransition.js';

const menu = { phase: 'menu', ringIndex: 0, activeKey: 'music', stop: 0, release: 0, mix: 0 };
test('scene route ownership normalizes router variants and excludes library/private/legacy pages', () => {
    assert.equal(normalizeSceneFilmPath('/Dubplates/'), '/dubplates');
    assert.equal(normalizeSceneFilmPath('/ADMIN/Dubplates/'), '/admin/dubplates');
    assert.equal(normalizeSceneFilmPath('/Login/'), '/login');
    for (const path of ['/', '/music', '/mixes/', '/code/', '/about/', '/CODE/', '/veiled/']) {
        assert.equal(isSceneFilmRoute(path, [{ title: 'Veiled' }]), true, path);
    }
    for (const path of ['/dubplates', '/admin/dubplates', '/login/', '/code-old', '/news', '/unpublished/']) {
        assert.equal(isSceneFilmRoute(path, [{ title: 'Unpublished', active: false }]), false, path);
    }
});
test('film triggers only on accepted menu movement or entry, not initial state or physical recentering', () => {
    assert.equal(isSceneFilmTransition(null, menu), false);
    assert.equal(isSceneFilmTransition(menu, { ...menu }), false);
    assert.equal(isSceneFilmTransition(menu, { ...menu, ringIndex: 1 }), true);
    assert.equal(isSceneFilmTransition(menu, { ...menu, phase: 'travel' }), true);
    assert.equal(isSceneFilmTransition(menu, { ...menu, phase: 'foreign' }), true);
    assert.equal(isSceneFilmTransition({ ...menu, phase: 'travel' }, { ...menu }), false);
    assert.equal(isSceneFilmTransition({ ...menu, phase: 'travel' }, { ...menu, phase: 'section' }), false);
});
test('film follows accepted section stops/releases/projects/mixes and return travel exactly once', () => {
    const section = { ...menu, phase: 'section' };
    for (const [key, value] of [['stop', 1], ['release', 1], ['mix', 1], ['activeKey', 'code']]) {
        assert.equal(isSceneFilmTransition(section, { ...section, [key]: value }), true);
    }
    assert.equal(isSceneFilmTransition(section, { ...section }), false);
    const travel = { ...section, phase: 'travel' };
    assert.equal(isSceneFilmTransition(section, travel), true);
    assert.equal(isSceneFilmTransition(travel, { ...travel, stop: 1 }), false);
});
