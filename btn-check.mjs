import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Find ALL elements that have lime-ish background and grab their computed text color
const found = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const bg = (cs.backgroundColor || '') + ' ' + (cs.backgroundImage || '');
    const isLime =
      /linear-gradient.*C0FF1F|linear-gradient.*DEFF00|linear-gradient.*FFE100|rgb\(192,\s*255,\s*31\)|rgb\(222,\s*255,\s*0\)|rgb\(255,\s*225,\s*0\)/i.test(bg);
    if (!isLime) continue;
    const txt = (el.innerText || '').trim();
    if (!txt || txt.length > 80 || txt.length < 1) continue;
    const color = cs.color;
    // Black-ish is OK
    const m = color.match(/rgb[a]?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      const isBlack = r < 50 && g < 50 && b < 50;
      out.push({ tag: el.tagName.toLowerCase(), txt: txt.slice(0, 50), color, isBlack });
    }
  }
  return out.slice(0, 20);
});
console.log(JSON.stringify(found, null, 2));
await browser.close();
