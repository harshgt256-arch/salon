import { gsap } from 'gsap';

export function initMagneticButtons() {
  // Only enable on desktop pointer devices
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return;
  }

  const magneticTargets = document.querySelectorAll(
    '.cta-btn, .book-now, .hero-book-cta, .pricing-cta, .newsletter-submit, .stylist-book-btn'
  );

  magneticTargets.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Magnetic pull strength (30% towards cursor)
      gsap.to(btn, {
        x: x * 0.35,
        y: y * 0.35,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });

    btn.addEventListener('mouseleave', () => {
      // Smooth elastic snap back to origin
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: 'elastic.out(1.1, 0.4)',
        overwrite: 'auto'
      });
    });
  });
}
