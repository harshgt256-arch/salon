import { initCanvasScrub } from '../utils/canvasScrub.js';

export function initHero() {
  const container = document.getElementById('hero');
  if (!container) return;

  container.innerHTML = `
    <div class="hero-canvas-container">
      <!-- Desktop/Tablet Canvas Scrub -->
      <canvas id="hero-canvas" class="hero-canvas"></canvas>

      <!-- Mobile Video Fallback -->
      <div class="hero-mobile-video-wrap">
        <video
          class="hero-mobile-video"
          src="/hero-mobile-fallback.mp4"
          autoplay
          muted
          loop
          playsinline
          poster="https://res.cloudinary.com/j6f3st1w/image/upload/f_auto,q_auto/scene1-mobile-0000.webp">
        </video>
      </div>

      <!-- Soft Warm Vignette Overlay -->
      <div class="hero-warm-vignette"></div>

      <!-- Centered Hero Text Content -->
      <div class="hero-content-reveal">
        <span class="hero-top-label">Premium Women's Beauty Studio</span>
        <h1 class="hero-main-title">You Deserve to Feel Beautiful</h1>
        <p class="hero-subtext">Hair · Bridal · Spa · Makeup · Lash & Brow</p>
        <div class="hero-cta-wrap">
          <a href="#cta" class="hero-book-cta">Book Your Experience &rarr;</a>
        </div>
      </div>

      <!-- Thin Gold Loading Progress Bar -->
      <div class="hero-progress-wrapper" id="hero-progress-wrap">
        <div class="hero-progress-bar" id="hero-progress-fill"></div>
      </div>
    </div>
  `;

  const progressWrap = document.getElementById('hero-progress-wrap');
  const progressFill = document.getElementById('hero-progress-fill');

  // Check if mobile for fallback behavior
  const isMobile = window.innerWidth < 768;

  if (!isMobile) {
    initCanvasScrub({
      isLocal: true,
      localFolder: 'scene1-desktop',
      canvasId: 'hero-canvas',
      totalFrames: 240,
      pinDistance: '1620px',
      textRevealAt: 0.85,
      triggerId: '#hero',
      onProgress: (percent) => {
        if (progressFill) {
          progressFill.style.width = `${percent}%`;
        }
      },
      onReady: () => {
        if (progressWrap) {
          progressWrap.classList.add('ready');
        }
      }
    });
  } else {
    // On mobile, progress bar hides quickly and text is visible statically
    if (progressWrap) progressWrap.classList.add('ready');
    const overlay = container.querySelector('.hero-content-reveal');
    if (overlay) {
      overlay.classList.add('mobile-static');
    }
  }
}
