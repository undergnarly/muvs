import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => ({
  bodyScrollWidth: document.body.scrollWidth,
  htmlScrollWidth: document.documentElement.scrollWidth,
  viewport: window.innerWidth,
  bodyOverflowX: getComputedStyle(document.body).overflowX,
}));
console.log(JSON.stringify(info, null, 2));

// Take updated screenshot
await page.screenshot({ path: '/tmp/landing-m-after-fix.png', fullPage: true });
await browser.close();
