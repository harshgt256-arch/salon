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

// Scroll to services and let the reveal play
await page.evaluate(() => document.querySelector('#services').scrollIntoView({ behavior: 'instant', block: 'start' }));
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: '/tmp/reveal-services.png' });

// Scroll to footer wordmark
await page.evaluate(() => document.querySelector('#footer').scrollIntoView({ behavior: 'instant', block: 'end' }));
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({ path: '/tmp/reveal-footer.png' });

// Sanity: reveal spans actually exist and became visible
const revealState = await page.evaluate(() => {
  const masks = document.querySelectorAll('.reveal-line-mask').length;
  const words = document.querySelectorAll('.reveal-word-inner').length;
  const firstHeading = document.querySelector('.services-heading .reveal-line-inner');
  const op = firstHeading ? getComputedStyle(firstHeading).opacity : 'n/a';
  const wordmark = document.querySelector('.footer-wordmark');
  const wordmarkStroke = wordmark ? getComputedStyle(wordmark).webkitTextStrokeWidth : 'n/a';
  return { masks, words, servicesHeadingOpacity: op, wordmarkStroke };
});
console.log(JSON.stringify(revealState, null, 2));

await browser.close();
