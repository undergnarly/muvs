
import { chromium } from 'playwright';

(async () => {
    console.log('--- Starting Full Site Verification ---');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const BASE_URL = 'http://localhost:5173';

    try {
        // 1. Music Page (Home)
        console.log('Checking Music Page (Home)...');
        await page.goto(BASE_URL);
        await page.waitForSelector('.music-page', { timeout: 5000 });
        const releaseSlide = await page.$('.release-cover-container');
        if (releaseSlide) console.log('✅ Music Page loaded with Release Slide.');
        else console.error('❌ Music Page missing Release Slide.');

        // 2. Mixes Page
        console.log('Checking Mixes Page...');
        await page.goto(`${BASE_URL}/mixes`);
        await page.waitForSelector('.mixes-page', { timeout: 5000 });
        const mixSlide = await page.$('.mix-cover-container');
        if (mixSlide) console.log('✅ Mixes Page loaded with Mix Slide.');
        else console.error('❌ Mixes Page missing Mix Slide.');

        // 3. Code Page
        console.log('Checking Code Page...');
        await page.goto(`${BASE_URL}/code`);
        await page.waitForSelector('.code-page', { timeout: 5000 });
        const projectSlide = await page.$('.project-cover-container');
        if (projectSlide) console.log('✅ Code Page loaded with Project Slide.');
        else console.error('❌ Code Page missing Project Slide.');

        // 4. News Page
        console.log('Checking News Page...');
        await page.goto(`${BASE_URL}/news`);
        // Wait for the news grid to appear
        await page.waitForSelector('.news-grid', { timeout: 5000 });
        const newsItems = await page.$$('.news-item');
        if (newsItems.length > 0) console.log(`✅ News Page loaded with ${newsItems.length} news items.`);
        else console.error('❌ News Page loaded but found 0 items.');

        // 5. About Page
        console.log('Checking About Page...');
        await page.goto(`${BASE_URL}/about`);
        await page.waitForSelector('.about-content', { timeout: 5000 });
        const socialLinks = await page.$('.social-links');
        if (socialLinks) console.log('✅ About Page loaded with Social Links.');
        else console.error('❌ About Page missing Social Links.');

    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        await browser.close();
        console.log('--- Full Site Verification Complete ---');
    }
})();
