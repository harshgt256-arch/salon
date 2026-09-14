import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initCanvasScrub } from '../utils/canvasScrub.js';

gsap.registerPlugin(ScrollTrigger);

export function initStudioTour() {
  const container = document.getElementById('studio-tour');
  if (!container) return;

  container.innerHTML = `
    <div class="canvas-wrapper">
      <canvas id="studio-canvas"></canvas>
      <div class="studio-overlay">
        <span class="hero-tagline" data-reveal-child>AN INTIMATE SANCTUARY</span>
        <h2 class="hero-heading" data-reveal="lines">The Noir Atelier Experience</h2>
        <p class="hero-description" data-reveal-child>Calacatta marble vanity stations, private botanical rinse suites, and champagne service curated for your serenity.</p>
        <div class="studio-highlights">
          <div class="highlight-chip" data-reveal-child>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
            <span>Private Bridal Suite</span>
          </div>
          <div class="highlight-chip" data-reveal-child>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
            </svg>
            <span>Botanical Scalp Spa</span>
          </div>
          <div class="highlight-chip" data-reveal-child>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 5v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5M6 5h12M9 5V3h6v2"/>
            </svg>
            <span>Champagne & Espresso Bar</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize canvas scrub animation
  initCanvasScrub({
    cloudFolderDesktop: 'scene2-desktop',
    cloudFolderMobile: 'scene2-mobile',
    canvasId: 'studio-canvas',
    totalFrames: 180,
    pinDistance: '1800px',
    triggerId: '#studio-tour',
    textRevealAt: 0.7
  });

  // Stagger highlight chip entrance with delay
  const chips = container.querySelectorAll('.highlight-chip');
  if (chips.length > 0) {
    gsap.fromTo(chips,
      { opacity: 0, y: 20, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.3,
        scrollTrigger: {
          trigger: container,
          start: 'top 65%',
          toggleActions: 'play none none none'
        }
      }
    );
  }

  // Magnetic hover effect on chips
  chips.forEach((chip) => {
    chip.addEventListener('mouseenter', () => {
      gsap.to(chip, {
        scale: 1.08,
        y: -4,
        duration: 0.4,
        ease: 'power3.out'
      });
    });
    chip.addEventListener('mouseleave', () => {
      gsap.to(chip, {
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'power3.out'
      });
    });
  });
}
