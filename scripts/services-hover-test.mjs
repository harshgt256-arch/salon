import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--disable-gpu', '--no-first-run', '--window-size=1440,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 5000));

// Scroll to services and let reveals play
await page.evaluate(() => document.querySelector('#services').scrollIntoView({ block: 'center' }));
await new Promise((r) => setTimeout(r, 2200));

await page.screenshot({ path: '/tmp/services-rest.png' });

// Hover the second card (Balayage)
const card = await page.$('#services-grid .service-card:nth-child(2) .service-media');
await card.hover();
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: '/tmp/services-hover.png' });

// Verify hover state actually engaged
const state = await page.evaluate(() => {
  const card = document.querySelectorAll('.service-card')[1];
  const arrow = card.querySelector('.service-arrow');
  const img = card.querySelector('.service-img');
  const hovered = card.matches(':hover');
  return {
    hovered,
    arrowOpacity: getComputedStyle(arrow).opacity,
    imgTransform: getComputedStyle(img).transform !== 'none',
    cards: document.querySelectorAll('.service-card').length,
    imagesNatural: Array.from(document.querySelectorAll('.service-img')).every((i) => i.naturalWidth > 0),
  };
});
console.log(JSON.stringify(state, null, 2));

await browser.close();
