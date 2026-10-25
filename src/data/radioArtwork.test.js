import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { RADIO_STATIONS } from './radio.js';

const sharp = createRequire(new URL('../../server/package.json', import.meta.url))('sharp');
const read = relative => readFile(new URL(relative, import.meta.url));
const current = [
    { slug: 'new-era', key: 'modern', version: 'v3', budget: 140000 },
    { slug: 'roots', key: 'oldschool', version: 'v2', budget: 200000 },
    { slug: 'y2k', key: 'y2k', version: 'v2', budget: 170000 },
];

test('all frontal era covers, loader priorities and inline recovery match; menu reuses New Era', async () => {
    const modern = RADIO_STATIONS.find(station => station.slug === 'new-era').coverImage;
    assert.equal(modern, '/images/radio/radio-modern-v3.webp');
    const menu = String(await read('./menuArtwork.js'));
    assert.ok(menu.includes(`'${modern}'`));
    assert.match(menu, /import radioModernFallback from '\.\.\/assets\/menu-fallback\/radio-modern-v3\.webp\?inline'/);
    assert.match(menu, /\[MENU_ARTWORK\[4\]\]: radioModernFallback/);
    assert.doesNotMatch(menu, /radio-(?:modern-v[12]|oldschool-v1|y2k-v1)/);
    const document = String(await read('../../index.html'));
    assert.ok(document.includes(`radioEra === 'new-era' ? '${modern}'`));
    for (const { slug, key, version } of current) {
        const file = `radio-${key}-${version}.webp`;
        assert.equal(RADIO_STATIONS.find(station => station.slug === slug).coverImage, `/images/radio/${file}`);
        assert.ok(menu.includes(`../assets/menu-fallback/${file}?inline`));
        assert.ok(menu.includes(`/images/radio/${file}`));
        assert.ok(document.includes(`/images/radio/${file}`));
    }
    const admin = String(await read('../components/admin/RadioSettings.jsx'));
    assert.match(admin, /station\?\.coverImage \|\| MENU_ARTWORK\[4\]/);
});

test('frontal receivers have genuine guarded alpha, aligned feet and identically framed recovery', async () => {
    const fullFeet = [];
    for (const { key, version, budget } of current) {
        let fullBounds;
        for (const [relative, size, byteBudget] of [
            [`../../public/images/radio/radio-${key}-${version}.webp`, 768, budget],
            [`../assets/menu-fallback/radio-${key}-${version}.webp`, 192, 15000],
        ]) {
            const bytes = await read(relative);
            assert.ok(bytes.length <= byteBudget, `${relative} exceeds its receiver budget`);
            const meta = await sharp(bytes).metadata();
            assert.deepEqual([meta.format, meta.width, meta.height, meta.hasAlpha], ['webp', size, size, true]);
            const stats = await sharp(bytes).stats();
            assert.equal(stats.isOpaque, false);
            const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            let minX = size, minY = size, maxX = -1, maxY = -1, count = 0, leftFoot = -1, rightFoot = -1;
            for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
                if (data[(y * size + x) * 4 + 3] < 16) continue;
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
                if (x > size * .05 && x < size * .45) leftFoot = Math.max(leftFoot, y);
                if (x > size * .55 && x < size * .95) rightFoot = Math.max(rightFoot, y);
            }
            assert.ok(minX / size > .035 && minY / size > .035, 'all details need a safe transparent border');
            assert.ok(maxX / size < .975 && maxY / size < .975);
            assert.ok(maxY / size > .95 && maxY / size < .968, 'feet keep the shared 96% canvas baseline');
            assert.ok(maxX / size > .95 && (maxX - minX) / size > .90, 'preserve complete consistent-width silhouettes');
            assert.ok(count / (size * size) > .35 && count / (size * size) < .65, 'no opaque backdrop or empty output');
            assert.ok(Math.abs(leftFoot - rightFoot) <= Math.ceil(size / 192), 'left and right feet must be level');
            const bounds = [minX, minY, maxX, maxY].map(value => value / size);
            if (fullBounds) bounds.forEach((value, index) => assert.ok(Math.abs(value - fullBounds[index]) < .012));
            else { fullBounds = bounds; fullFeet.push(maxY); }
        }
    }
    assert.ok(Math.max(...fullFeet) - Math.min(...fullFeet) <= 2, 'all three receivers share the same foot baseline');
});

test('every previous receiver stays byte-identical and available for cached releases', async () => {
    for (const [key, version, expected] of [
        ['oldschool', 'v1', '745d515dfc5e2d2594fffdbfd3841db1d9a9bdac5984a8f08db89424efd57c92'],
        ['y2k', 'v1', 'fe4c9cf200a140a285250a5e45ff3a939ae88d73cce3c5c89d58e0658c933e62'],
        ['modern', 'v1', 'b682e096dfc82fec991a141db22fd7c6a32c11ddf998013706c30b57a77ae109'],
        ['modern', 'v2', '542ef437f7c2ff089a2d497cfe1605c26a0df5b45537ac98cd17ebdff6d3d1fa'],
    ]) {
        const bytes = await read(`../../public/images/radio/radio-${key}-${version}.webp`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
        assert.ok((await read(`../assets/menu-fallback/radio-${key}-${version}.webp`)).length > 0);
    }
});
