import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initImageParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // ── Stylist Photos Parallax ──
  const stylistPhotos = document.querySelectorAll('.stylist-photo');
  stylistPhotos.forEach((photo) => {
    gsap.fromTo(
      photo,
      { yPercent: -8, scale: 1.08 },
      {
        yPercent: 8,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: photo.closest('.stylist-card') || photo,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      }
    );
  });

  // ── Instagram Grid subtle depth ──
  const instaImages = document.querySelectorAll('.instagram-img');
  instaImages.forEach((img, i) => {
    const shift = (i % 2 === 0 ? 1 : -1) * 6;
    gsap.fromTo(
      img,
      { yPercent: -shift, scale: 1.06 },
      {
        yPercent: shift,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: {
          trigger: '#instagram',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2
        }
      }
    );
  });

  // ── Before/After imagery — slow editorial drift inside the frame ──
  const baImages = document.querySelectorAll('.ba-layer img');
  baImages.forEach((img, i) => {
    gsap.fromTo(
      img,
      { yPercent: i === 0 ? -5 : -4, scale: 1.06 },
      {
        yPercent: i === 0 ? 5 : 4,
        scale: 1.06,
        ease: 'none',
        scrollTrigger: {
          trigger: '.ba-slider-container',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.4
        }
      }
    );
  });

  // ── CTA glow — breathes with scroll for a quiet cinematic close ──
  const ctaGlow = document.querySelector('.cta-glow');
  if (ctaGlow) {
    gsap.fromTo(
      ctaGlow,
      { scale: 0.75, opacity: 0.5 },
      {
        scale: 1.15,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#cta',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.6
        }
      }
    );
  }

  // ── Footer wordmark — ghost mark rises slowly as the page ends ──
  const wordmark = document.querySelector('.footer-wordmark');
  if (wordmark) {
    gsap.fromTo(
      wordmark,
      { yPercent: 42 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '#footer',
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.2
        }
      }
    );
  }
}
