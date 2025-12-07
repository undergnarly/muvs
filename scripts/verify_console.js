
import { chromium } from 'playwright';

(async () => {
    console.log('--- Starting Playwright Verification ---');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Listen for console logs
    page.on('console', msg => {
        console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });

    // Listen for uncaught exceptions
    page.on('pageerror', exception => {
        console.error(`[Browser Error] ${exception}`);
    });

    // Listen for failed requests (e.g. 404s)
    page.on('requestfailed', request => {
        console.error(`[Network Error] ${request.url()} - ${request.failure().errorText}`);
    });

    try {
        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

        console.log('Page loaded. Waiting 5 seconds to capture delayed logs...');
        await page.waitForTimeout(5000); // Wait for animations/scripts

        // Check for specific elements to confirm rendering
        const root = await page.$('#root');
        if (root) console.log('✅ Root element found.');
        else console.error('❌ Root element NOT found.');

        const canvas = await page.$('canvas');
        if (canvas) console.log('✅ Canvas element (Three.js) found.');
        else console.log('⚠️ Canvas element NOT found (might be normal if using internal DOM for ReactBits, but usually expected).');

    } catch (error) {
        console.error('Script Execution Error:', error);
    } finally {
        await browser.close();
        console.log('--- Verification Complete ---');
    }
})();
