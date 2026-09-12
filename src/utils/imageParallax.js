import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initImageParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Stylist Photos Parallax
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

  // Instagram Grid subtle depth
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
}
