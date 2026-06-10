import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(500);

// Scroll to each section, screenshot it
for (const id of ['products', 'process', 'pricing', 'faq', 'book']) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/sec-${id}.png`, fullPage: false });

  const info = await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (!el) return { id, found: false };
    const rect = el.getBoundingClientRect();
    const text = (el.innerText || '').slice(0, 200).replace(/\s+/g, ' ');
    const cards = el.querySelectorAll('article, .rounded-3xl, .rounded-2xl').length;
    return { id, found: true, h: el.offsetHeight, w: el.offsetWidth, scrollY: window.scrollY, top: rect.top, text, cards };
  }, id);
  console.log(JSON.stringify(info));
}

await browser.close();
