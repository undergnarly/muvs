import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const data = await page.evaluate(() => {
  // Find anchor with "Book Discovery Call"
  const a = Array.from(document.querySelectorAll('a')).find(x => /Book Discovery|Book a call|Choose this tier/i.test(x.innerText));
  if (!a) return { found: false };
  const cs = getComputedStyle(a);

  // Manually walk up matching rules
  const rules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const r of sheet.cssRules) {
        if (r.cssText && r.style && r.style.color) {
          if (a.matches(r.selectorText)) {
            rules.push({ selector: r.selectorText, color: r.style.color });
          }
        }
      }
    } catch (_) {}
  }

  return {
    found: true,
    html: a.outerHTML.slice(0, 250),
    className: a.className,
    color: cs.color,
    fontSize: cs.fontSize,
    matchingRules: rules.slice(0, 12),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
