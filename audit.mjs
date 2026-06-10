import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });

// Desktop
const ctxD = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pageD = await ctxD.newPage();
const errors = [];
pageD.on('console', m => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
pageD.on('pageerror', e => errors.push('[pageerror] ' + e.message));

await pageD.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await pageD.waitForTimeout(800);
await pageD.screenshot({ path: '/tmp/landing-d.png', fullPage: true });

const desktopMeta = await pageD.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('section, header, footer, main > div')).slice(0, 30);
  return {
    title: document.title,
    bodyOverflow: getComputedStyle(document.body).overflowX,
    docHeight: document.documentElement.scrollHeight,
    sections: sections.map(s => ({
      tag: s.tagName.toLowerCase(),
      id: s.id || null,
      cls: (s.className || '').slice(0, 60),
      h: s.offsetHeight,
      w: s.offsetWidth,
    })),
  };
});

// Mobile
const ctxM = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const pageM = await ctxM.newPage();
const mErrors = [];
pageM.on('console', m => { if (m.type() === 'error') mErrors.push('[m-console] ' + m.text()); });
pageM.on('pageerror', e => mErrors.push('[m-pageerror] ' + e.message));

await pageM.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 60000 });
await pageM.waitForTimeout(800);
await pageM.screenshot({ path: '/tmp/landing-m.png', fullPage: true });

const mobileMeta = await pageM.evaluate(() => ({
  docHeight: document.documentElement.scrollHeight,
  bodyOverflow: getComputedStyle(document.body).overflowX,
  // detect horizontal overflow
  horizontalOverflow: Array.from(document.querySelectorAll('*')).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 390 || r.right > 390;
  }).slice(0, 5).map(el => ({
    tag: el.tagName.toLowerCase(),
    cls: (el.className || '').toString().slice(0, 50),
    w: Math.round(el.getBoundingClientRect().width),
    right: Math.round(el.getBoundingClientRect().right),
  })),
}));

console.log(JSON.stringify({ desktop: desktopMeta, mobile: mobileMeta, errors, mErrors }, null, 2));
await browser.close();
