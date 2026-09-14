import './styles/main.css';

// Self-hosted fonts — no render-blocking Google Fonts request, no FOUT
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/jost/300.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import '@fontsource/jost/600.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { initHero } from './sections/hero.js';
import { initTrustBar } from './sections/trust-bar.js';
import { initTransformation } from './sections/transformation.js';
import { initServices } from './sections/services.js';
import { initStudioTour } from './sections/studio-tour.js';
import { initStylists } from './sections/stylists.js';
import { initProcess } from './sections/process.js';
import { initTestimonials } from './sections/testimonials.js';
import { initPricing } from './sections/pricing.js';
import { initFaq } from './sections/faq.js';
import { initInstagram } from './sections/instagram.js';
import { initCta } from './sections/cta.js';
import { initFooter } from './sections/footer.js';

import { initPreloader } from './utils/preloader.js';
import { initMagneticButtons } from './utils/magnetic.js';
import { initCustomCursor } from './utils/customCursor.js';
import { initImageParallax } from './utils/imageParallax.js';
import { initHeadingReveals } from './utils/headingReveal.js';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  // 1. Velvet Reveal Preloader
  initPreloader(() => {
    // 2. Smooth scroll with Lenis (start after preloader)
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 3. Initialize interactive features
    initMagneticButtons();
    initCustomCursor();
    initImageParallax();
  });

  // Nav scroll behavior (can stay outside)
  const nav = document.querySelector('.fixed-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Initialize sections
  initHero();
  initTrustBar();
  initTransformation();
  initServices();
  initStudioTour();
  initStylists();
  initProcess();
  initTestimonials();
  initPricing();
  initFaq();
  initInstagram();
  initCta();
  initFooter();

  initMobileNav();

  // Split-line reveals must measure text — wait for the real fonts,
  // otherwise line breaks are computed with fallback metrics.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => initHeadingReveals());
  } else {
    initHeadingReveals();
  }
});

// Mobile menu — full-screen editorial overlay with staggered reveal
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.classList.toggle('open', open);
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };

  toggle.addEventListener('click', () => {
    setOpen(!menu.classList.contains('open'));
  });

  // Close after tapping any link so the page scrolls to the section
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}
