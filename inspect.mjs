import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

async function inspect(viewport, label) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  const issues = await page.evaluate((vw) => {
    const out = { horizontal: [], tiny: [], huge: [], emptyBoxes: [], broken: [] };

    // Horizontal overflow
    const all = document.querySelectorAll('main *, footer *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0 && r.height > 0) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'absolute' && cs.position !== 'fixed') {
          out.horizontal.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 60),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
          if (out.horizontal.length > 6) break;
        }
      }
    }

    // Tiny text (<10px)
    document.querySelectorAll('h1, h2, h3, h4, p, span, a, button, li').forEach(el => {
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 10 && el.textContent && el.textContent.trim().length > 3) {
        out.tiny.push({ tag: el.tagName.toLowerCase(), fs, text: el.textContent.trim().slice(0, 40) });
      }
    });
    out.tiny = out.tiny.slice(0, 5);

    // Huge stuff that looks broken (single elements >2000px tall)
    document.querySelectorAll('section > div, article').forEach(el => {
      if (el.offsetHeight > 1500 && vw < 500) {
        out.huge.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
          h: el.offsetHeight,
        });
      }
    });
    out.huge = out.huge.slice(0, 5);

    return out;
  }, viewport.width);

  await ctx.close();
  return { label, ...issues };
}

console.log(JSON.stringify(await inspect({ width: 390, height: 844 }, 'mobile-390'), null, 2));
console.log('---');
console.log(JSON.stringify(await inspect({ width: 1440, height: 900 }, 'desktop-1440'), null, 2));

await browser.close();
