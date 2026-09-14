import { gsap } from 'gsap';

/**
 * Velvet curtain preloader:
 *   1. Wordmark + tagline rise in, gold line draws
 *   2. Percentage counter ticks up as the page actually loads
 *   3. Curtain splits into two panels and wipes vertically
 *   4. Nav drops in as the curtain lifts
 */
export function initPreloader(onComplete) {
  let preloader = document.getElementById('noir-preloader');
  if (!preloader) {
    preloader = document.createElement('div');
    preloader.id = 'noir-preloader';
    preloader.innerHTML = `
      <div class="preloader-panel preloader-panel-top"></div>
      <div class="preloader-panel preloader-panel-bottom"></div>
      <div class="preloader-inner">
        <div class="preloader-logo">
          <span class="preloader-mark">✤</span>NOIR STUDIO
        </div>
        <p class="preloader-subtext">A Sanctuary for Women's Beauty</p>
        <div class="preloader-line"></div>
        <div class="preloader-counter">0</div>
      </div>
    `;
    document.body.prepend(preloader);
  }

  const counterEl = preloader.querySelector('.preloader-counter');
  const counter = { value: 0 };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    preloader.style.display = 'none';
    if (onComplete) onComplete();
    return;
  }

  // Entrance
  const tl = gsap.timeline();
  tl.to('.preloader-logo', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.1 })
    .to('.preloader-subtext', { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.5')
    .to('.preloader-line', { width: '140px', duration: 0.8, ease: 'power2.inOut' }, '-=0.4')
    .to(counterEl, { opacity: 1, duration: 0.4 }, '-=0.3');

  // Counter tracks real page load, eased so it feels intentional
  const tick = () => {
    const target = Math.min(99, Math.round((performance.now() / 1800) * 100));
    gsap.to(counter, {
      value: target,
      duration: 0.3,
      ease: 'power1.out',
      overwrite: true,
      onUpdate: () => {
        if (counterEl) counterEl.textContent = String(Math.round(counter.value)).padStart(3, '0');
      },
    });
  };
  const tickInterval = setInterval(tick, 250);
  tick();

  const dismiss = () => {
    clearInterval(tickInterval);

    const exitTl = gsap.timeline({
      onComplete: () => {
        if (preloader) preloader.style.display = 'none';
        if (onComplete) onComplete();
      },
    });

    exitTl
      // Finish the count to 100 with a flourish
      .to(counter, {
        value: 100,
        duration: 0.4,
        ease: 'power2.in',
        onUpdate: () => {
          if (counterEl) counterEl.textContent = String(Math.round(counter.value)).padStart(3, '0');
        },
      })
      // Content sinks away…
      .to('.preloader-inner', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' }, '-=0.05')
      // …and the curtain splits: top panel up, bottom panel down
      .to('.preloader-panel-top', { yPercent: -100, duration: 1.1, ease: 'power4.inOut' }, '-=0.1')
      .to('.preloader-panel-bottom', { yPercent: 100, duration: 1.1, ease: 'power4.inOut' }, '<')
      // Nav descends into the cleared stage
      .from('.fixed-nav', { y: -40, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.55');
  };

  window.addEventListener('load', dismiss, { once: true });
  // Safety net: never hold the visitor hostage if a resource stalls
  setTimeout(dismiss, 3500);
}
