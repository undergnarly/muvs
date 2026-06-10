import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });

const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const pageM = await ctxM.newPage();
await pageM.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await pageM.waitForTimeout(1500);
await pageM.screenshot({ path: '/tmp/landing-m-fixed.png', fullPage: true });

const h = await pageM.evaluate(() => document.documentElement.scrollHeight);
console.log('mobile docHeight:', h);
await browser.close();
