import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';
const errors = [];
const failedRequests = [];

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--disable-gpu', '--no-first-run', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => {
    failedRequests.push(`[requestfailed] ${req.failure()?.errorText} ${req.url()}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) failedRequests.push(`[HTTP ${res.status()}] ${res.url()}`);
  });

  console.log('Loading page...');
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Give the preloader (auto-dismiss ~1.4s) and hero init time to run
  await new Promise((r) => setTimeout(r, 6000));

  // Page state
  const state = await page.evaluate(() => {
    const qs = (s) => document.querySelector(s);
    return {
      title: document.title,
      preloaderVisible: (() => {
        const p = document.getElementById('noir-preloader');
        return p ? getComputedStyle(p).display !== 'none' : false;
      })(),
      navExists: !!qs('.fixed-nav'),
      navLinks: document.querySelectorAll('.nav-links a').length,
      heroCanvas: !!qs('#hero-canvas'),
      heroCanvasPainted: (() => {
        const c = qs('#hero-canvas');
        if (!c) return false;
        try {
          return c.width > 0 && c.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0;
        } catch { return false; }
      })(),
      mobileToggleVisible: (() => {
        const t = qs('.nav-toggle');
        if (!t) return false;
        const s = getComputedStyle(t);
        return s.display !== 'none';
      })(),
      sectionsPopulated: ['#services', '#stylists', '#pricing', '#footer'].map((id) => {
        const el = document.getElementById(id.replace('#', ''));
        return `${id}: ${el && el.innerHTML.length > 100 ? 'filled' : 'EMPTY'}`;
      }),
      bodyScrollHeight: document.body.scrollHeight,
      fontsLoaded: document.fonts.status,
      grainOverlay: getComputedStyle(document.body, '::before').backgroundImage.includes('svg'),
    };
  });

  console.log('\n=== PAGE STATE ===');
  console.log(JSON.stringify(state, null, 2));

  // Test 1: desktop nav links present
  console.log(`\nTest desktop nav links (expect 4): ${state.navLinks === 4 ? 'PASS' : 'FAIL'}`);

  // Test 2: canvas painted
  console.log(`Test hero canvas painted: ${state.heroCanvasPainted ? 'PASS' : 'FAIL'}`);

  // Test 3: preloader dismissed
  console.log(`Test preloader dismissed: ${!state.preloaderVisible ? 'PASS' : 'FAIL'}`);

  // Desktop screenshot
  await page.screenshot({ path: '/tmp/test-desktop.png' });
  console.log('\nSaved /tmp/test-desktop.png');

  // Test 4: mobile viewport — nav toggle appears, menu opens
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 800));

  const mobileToggleVisible = await page.evaluate(() => {
    const t = document.querySelector('.nav-toggle');
    return t ? getComputedStyle(t).display !== 'none' : false;
  });
  console.log(`\nTest mobile toggle visible at 390px: ${mobileToggleVisible ? 'PASS' : 'FAIL'}`);

  if (mobileToggleVisible) {
    await page.click('.nav-toggle');
    await new Promise((r) => setTimeout(r, 900));
    const menuOpen = await page.evaluate(() => {
      const m = document.getElementById('mobile-menu');
      return m ? m.classList.contains('open') : false;
    });
    console.log(`Test mobile menu opens: ${menuOpen ? 'PASS' : 'FAIL'}`);
    await page.screenshot({ path: '/tmp/test-mobile-menu.png' });
    console.log('Saved /tmp/test-mobile-menu.png');

    // Click a link (JS click — robust to the stagger reveal animation) — menu should close
    await page.evaluate(() => {
      document.querySelector('.mobile-menu-links a[href="#services"]').click();
    });
    await new Promise((r) => setTimeout(r, 700));
    const menuClosed = await page.evaluate(() => {
      const m = document.getElementById('mobile-menu');
      return m ? !m.classList.contains('open') : true;
    });
    console.log(`Test menu closes on link tap: ${menuClosed ? 'PASS' : 'FAIL'}`);
  }

  await page.screenshot({ path: '/tmp/test-mobile.png' });
  console.log('Saved /tmp/test-mobile.png');

  console.log('\n=== CONSOLE ERRORS/WARNINGS ===');
  console.log(errors.length ? errors.join('\n') : '(none)');
  console.log('\n=== FAILED REQUESTS ===');
  console.log(failedRequests.length ? failedRequests.join('\n') : '(none)');

  await browser.close();
  const failed = errors.filter((e) => e.includes('pageerror')).length > 0;
  console.log(`\n=== RESULT: ${failed ? 'FAILURES FOUND' : 'ALL CHECKS RAN'} ===`);
}

test().catch((e) => {
  console.error('TEST CRASHED:', e.message);
  process.exit(1);
});
