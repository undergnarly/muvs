import test from 'node:test';
import assert from 'node:assert/strict';
import { scenePublicPath } from './scenePublicPath.js';

test('3D selection keeps actual public canonicals in sync without a canvas remount', () => {
    const base = { hub: true, phase: 'section', search: '?utm_source=friend&item=old' };
    assert.equal(scenePublicPath({ ...base, section: 'music', item: { title: 'Veiled' } }), '/veiled?utm_source=friend');
    assert.equal(scenePublicPath({ ...base, section: 'code', item: { title: 'AI Agents' } }), '/code?utm_source=friend&item=ai-agents');
    assert.equal(scenePublicPath({ ...base, section: 'mixes', item: { title: 'Dub Session' } }), '/mixes?utm_source=friend&item=dub-session');
    assert.equal(scenePublicPath({ ...base, section: 'about' }), '/about?utm_source=friend');
    assert.equal(scenePublicPath({ ...base, phase: 'menu' }), '/?utm_source=friend');
    assert.equal(scenePublicPath({ ...base, phase: 'travel' }), null);
    assert.equal(scenePublicPath({ ...base, hub: false, section: 'music', item: { title: 'CV' } }), null);
});
