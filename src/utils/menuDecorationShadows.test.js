import test from 'node:test';
import assert from 'node:assert/strict';
import { createMenuDecorationLayout } from './menuDecorations.js';
import { createMenuDecorationShadows, menuDecorationShadowHeight } from './menuDecorationShadows.js';
import { SPRITE_SHADOW_DEFAULTS } from './spriteShadow.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≠ ${expected}`);
const music = () => createMenuDecorationLayout({ sectionKey: 'music' });
const mixes = () => createMenuDecorationLayout({ sectionKey: 'mixes' });

test('ground props reuse one cast and one anchored contact, without mutating their measured layout', () => {
    for (const prop of [...music(), ...mixes()]) {
        const before = JSON.stringify(prop);
        const [cast, contact] = createMenuDecorationShadows(prop);
        assert.equal(cast.kind, 'cast'); assert.equal(contact.kind, 'contact');
        assert.deepEqual(contact.position, [prop.shadow.position[0], prop.shadow.position[1] + .001, prop.shadow.position[2]]);
        assert.deepEqual(contact.size, [prop.shadow.size[0] * .86, prop.shadow.size[1] * .68]);
        assert.ok(cast.height > 0); near(cast.castLength, cast.height * SPRITE_SHADOW_DEFAULTS.length);
        assert.equal(JSON.stringify(prop), before);
    }
});

test('cast directions match the main floor convention while the core never moves', () => {
    const prop = music()[2];
    const anchor = prop.shadow.position;
    const cardinals = [[0, 0, -1], [90, 1, 0], [180, 0, 1], [270, -1, 0]];
    for (const [directionDegrees, x, z] of cardinals) {
        const [cast, contact] = createMenuDecorationShadows(prop, { directionDegrees, length: 2 });
        near(cast.position[0] - anchor[0], x * cast.castLength / 2);
        near(cast.position[2] - anchor[2], z * cast.castLength / 2);
        near(cast.position[1], anchor[1]);
        assert.deepEqual(contact.position, [anchor[0], anchor[1] + .001, anchor[2]]);
        near(cast.yaw, -directionDegrees * Math.PI / 180);
    }
});

test('model casts use true posed height so flat vinyl and cassettes stay near the floor', () => {
    const props = mixes();
    const flatCassette = props.find(prop => prop.model.kind === 'cassette' && prop.model.pose === 'flat');
    const standingCassette = props.find(prop => prop.model.kind === 'cassette' && prop.model.pose === 'standing');
    const vinyl = props.find(prop => prop.model.kind === 'vinyl');
    near(menuDecorationShadowHeight(flatCassette), .12 * flatCassette.scale);
    near(menuDecorationShadowHeight(standingCassette), .64 * standingCassette.scale);
    near(menuDecorationShadowHeight(vinyl), .012 * vinyl.scale);
    const [vinylCast] = createMenuDecorationShadows(vinyl, { length: 3 });
    near(vinylCast.castLength, .036 * vinyl.scale);
    assert.ok(vinylCast.castLength < vinyl.shadow.size[0] * .04);
});

test('sprite casts exclude transparent padding and use the rolled measured foot', () => {
    const prop = {
        grounded: true, scale: .4, rotation: [0, .2, .1], foot: { y: -.2 },
        asset: { width: 1000, height: 1000, opaqueBounds: [-100, 100, -200, 100], footHull: [[0, -200]] },
        shadow: { position: [0, 0, 0], size: [.15, .04] },
    };
    const expectedTop = (100 * Math.sin(.1) + 100 * Math.cos(.1)) / 1000;
    near(menuDecorationShadowHeight(prop), (expectedTop + .2) * .4);
    assert.ok(menuDecorationShadowHeight(prop) < .4 / 2, 'not the padded 1000px image height');
});

test('global opacity and blur tune both existing shadows without changing the cast height or contact', () => {
    const prop = music()[0];
    const [sharp, sharpCore] = createMenuDecorationShadows(prop, { opacity: .2, blur: 0 });
    const [soft, softCore] = createMenuDecorationShadows(prop, { opacity: .4, blur: 1 });
    assert.ok(soft.size[0] > sharp.size[0]); assert.ok(soft.size[1] > sharp.size[1]);
    near(soft.castLength, sharp.castLength);
    near(soft.opacity, sharp.opacity * 2); near(softCore.opacity, sharpCore.opacity * 2);
    assert.deepEqual(softCore.position, sharpCore.position);
    assert.deepEqual(softCore.size, sharpCore.size);
    for (const shadow of createMenuDecorationShadows(prop, { opacity: 1 })) assert.ok(shadow.opacity <= 1);
});

test('disabled, zero-opacity, ungrounded and missing props create no shadow meshes', () => {
    const prop = music()[0];
    for (const settings of [{ enabled: false }, { opacity: 0 }]) assert.deepEqual(createMenuDecorationShadows(prop, settings), []);
    for (const empty of [undefined, null, {}, { ...prop, grounded: false }, { ...prop, shadow: null }]) {
        assert.deepEqual(createMenuDecorationShadows(empty), []);
        near(menuDecorationShadowHeight(empty), 0);
    }
    for (const floating of createMenuDecorationLayout({ sectionKey: 'code' })) assert.deepEqual(createMenuDecorationShadows(floating), []);
});
