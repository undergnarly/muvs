import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { RADIO_STATIONS } from './radio.js';

const sharp = createRequire(new URL('../../server/package.json', import.meta.url))('sharp');
const read = relative => readFile(new URL(relative, import.meta.url));

test('modern menu, New Era, loader priority and inline recovery use the same new receiver', async () => {
    const modern = RADIO_STATIONS.find(station => station.slug === 'new-era').coverImage;
    assert.equal(modern, '/images/radio/radio-modern-v2.webp');
    const menu = String(await read('./menuArtwork.js'));
    assert.ok(menu.includes(`'${modern}'`));
    assert.match(menu, /import radioModernFallback from '\.\.\/assets\/menu-fallback\/radio-modern-v2\.webp\?inline'/);
    assert.match(menu, /\[MENU_ARTWORK\[4\]\]: radioModernFallback/);
    assert.doesNotMatch(menu, /radio-modern-v1/);
    const document = String(await read('../../index.html'));
    assert.ok(document.includes(`radioEra === 'new-era' ? '${modern}'`));
    const admin = String(await read('../components/admin/RadioSettings.jsx'));
    assert.match(admin, /station\?\.coverImage \|\| MENU_ARTWORK\[4\]/);
});

test('modern receiver has genuine bounded alpha, complete antenna and feet and smaller matched fallback', async () => {
    let fullBounds;
    for (const [relative, size, budget] of [
        ['../../public/images/radio/radio-modern-v2.webp', 768, 188088],
        ['../assets/menu-fallback/radio-modern-v2.webp', 192, 12684],
    ]) {
        const bytes = await read(relative);
        assert.ok(bytes.length <= budget, `${relative} exceeds the previous receiver budget`);
        const meta = await sharp(bytes).metadata();
        assert.deepEqual([meta.format, meta.width, meta.height, meta.hasAlpha], ['webp', size, size, true]);
        const stats = await sharp(bytes).stats();
        assert.equal(stats.isOpaque, false);
        const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let minX = size, minY = size, maxX = -1, maxY = -1, count = 0;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            if (data[(y * size + x) * 4 + 3] < 16) continue;
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
        }
        assert.ok(minX / size > .025 && minY / size > .025, 'all details need a safe transparent border');
        assert.ok(maxX / size < .975 && maxY / size < .975);
        assert.ok(maxY / size > .93 && maxX / size > .93, 'keep the existing visual scale and foot position');
        assert.ok(count / (size * size) > .45 && count / (size * size) < .6, 'no opaque backdrop or empty output');
        const bounds = [minX, minY, maxX, maxY].map(value => value / size);
        if (fullBounds) bounds.forEach((value, index) => assert.ok(Math.abs(value - fullBounds[index]) < .012));
        else fullBounds = bounds;
    }
});

test('Roots and Y2K pixels remain unchanged and old modern cached assets stay available', async () => {
    for (const [key, expected] of [
        ['oldschool', '745d515dfc5e2d2594fffdbfd3841db1d9a9bdac5984a8f08db89424efd57c92'],
        ['y2k', 'fe4c9cf200a140a285250a5e45ff3a939ae88d73cce3c5c89d58e0658c933e62'],
        ['modern', 'b682e096dfc82fec991a141db22fd7c6a32c11ddf998013706c30b57a77ae109'],
    ]) {
        const bytes = await read(`../../public/images/radio/radio-${key}-v1.webp`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    }
    assert.ok((await read('../assets/menu-fallback/radio-modern-v1.webp')).length > 0);
});
