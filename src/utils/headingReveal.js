import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Luxury heading reveals — applied site-wide by data attribute:
 *
 *   data-reveal="lines"   → heading split into masked lines, staggered rise
 *   data-reveal="words"   → word-by-word rise with slight blur-in
 *   data-reveal="fade"    → soft editorial fade-up
 *   data-reveal="clip"    → clip-path curtain reveal (display moments)
 *
 * Optionally add data-reveal-delay="0.2" for a head start (seconds).
 * Falls back to visible (no animation) under prefers-reduced-motion.
 */

function splitIntoLines(el) {
  // Wrap each rendered line in a mask span so we can slide text up from
  // behind an overflow-hidden mask — the classic editorial reveal.
  const original = el.textContent.trim().replace(/\s+/g, ' ');
  el.textContent = '';
  const words = original.split(' ');
  const lines = [];
  let currentLine = null;
  const probe = document.createElement('span');
  probe.style.visibility = 'hidden';
  probe.style.position = 'absolute';
  probe.style.whiteSpace = 'nowrap';
  document.body.appendChild(probe);

  words.forEach((word) => {
    const text = currentLine ? `${currentLine} ${word}` : word;
    probe.textContent = text;
    if (currentLine && probe.getBoundingClientRect().width > el.clientWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = text;
    }
  });
  if (currentLine) lines.push(currentLine);
  probe.remove();

  const maskSpans = lines.map((lineText) => {
    const mask = document.createElement('span');
    mask.className = 'reveal-line-mask';
    const inner = document.createElement('span');
    inner.className = 'reveal-line-inner';
    inner.textContent = lineText;
    mask.appendChild(inner);
    el.appendChild(mask);
    return inner;
  });

  return maskSpans;
}

function splitIntoWords(el) {
  const original = el.textContent.trim().replace(/\s+/g, ' ');
  el.textContent = '';
  const inners = [];
  original.split(' ').forEach((word) => {
    const mask = document.createElement('span');
    mask.className = 'reveal-line-mask';
    const inner = document.createElement('span');
    inner.className = 'reveal-word-inner';
    inner.textContent = word;
    mask.appendChild(inner);
    el.appendChild(mask);
    inners.push(inner);
  });
  return inners;
}

export function initHeadingReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  targets.forEach((el) => {
    const mode = el.getAttribute('data-reveal');
    const delay = parseFloat(el.getAttribute('data-reveal-delay') || '0', 10);

    // Reduced motion: never hide content
    if (reduced || !mode) {
      el.style.opacity = '1';
      return;
    }

    let animTargets = null;
    let fromVars = {};
    let toVars = {};

    switch (mode) {
      case 'lines': {
        animTargets = splitIntoLines(el);
        fromVars = { yPercent: 115, rotate: 2 };
        toVars = { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.09 };
        break;
      }
      case 'words': {
        animTargets = splitIntoWords(el);
        fromVars = { yPercent: 110, opacity: 0, filter: 'blur(6px)' };
        toVars = { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, stagger: 0.045 };
        break;
      }
      case 'clip': {
        fromVars = { clipPath: 'inset(0 0 100% 0)', y: 30 };
        toVars = { clipPath: 'inset(0 0 -10% 0)', y: 0, duration: 1.2 };
        animTargets = [el];
        break;
      }
      case 'fade':
      default: {
        fromVars = { opacity: 0, y: 36 };
        toVars = { opacity: 1, y: 0, duration: 1.1 };
        animTargets = [el];
        break;
      }
    }

    gsap.set(animTargets, fromVars);

    gsap.to(animTargets, {
      ...toVars,
      ease: 'power4.out',
      delay,
      scrollTrigger: {
        trigger: el.closest('section') || el,
        start: 'top 72%',
        toggleActions: 'play none none none',
      },
    });
  });

  // Subheadings + body copy inside a section header get a quiet follow-up fade
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    const items = group.querySelectorAll('[data-reveal-child]');
    if (!items.length) return;

    if (reduced) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(items, { opacity: 0, y: 26 });
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: group,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
    });
  });
}
