import { gsap } from 'gsap';

export function initCustomCursor() {
  // Only enable on desktop pointer devices
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    return;
  }

  // Create cursor elements
  const cursorDot = document.createElement('div');
  cursorDot.className = 'custom-cursor-dot';

  const cursorRing = document.createElement('div');
  cursorRing.className = 'custom-cursor-ring';
  cursorRing.innerHTML = '<span class="cursor-label"></span>';

  document.body.appendChild(cursorDot);
  document.body.appendChild(cursorRing);

  const label = cursorRing.querySelector('.cursor-label');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isVisible = false;

  // Track mouse position
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isVisible) {
      isVisible = true;
      gsap.to([cursorDot, cursorRing], { opacity: 1, duration: 0.3 });
    }

    // Dot snaps immediately
    gsap.to(cursorDot, {
      x: mouseX,
      y: mouseY,
      duration: 0.08,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    // Ring trails smoothly
    gsap.to(cursorRing, {
      x: mouseX,
      y: mouseY,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => {
    isVisible = false;
    gsap.to([cursorDot, cursorRing], { opacity: 0, duration: 0.3 });
  });

  // Interactive Hover States
  const setupHover = (selector, className, text = '') => {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        cursorRing.classList.add(className);
        cursorDot.classList.add('hidden');
        if (text && label) label.textContent = text;
      });
      el.addEventListener('mouseleave', () => {
        cursorRing.classList.remove(className);
        cursorDot.classList.remove('hidden');
        if (label) label.textContent = '';
      });
    });
  };

  // Links, Buttons, and Clickables
  setupHover('a, button, .faq-question, .highlight-chip, .pricing-card', 'cursor-hover');

  // Transformation Slider -> "DRAG"
  setupHover('.ba-slider-container', 'cursor-drag', 'DRAG');

  // Instagram Cards -> "VIEW"
  setupHover('.instagram-card', 'cursor-view', 'VIEW');
}
