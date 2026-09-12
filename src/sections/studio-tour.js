import { initCanvasScrub } from '../utils/canvasScrub.js';

export function initStudioTour() {
  const container = document.getElementById('studio-tour');
  if (!container) return;

  container.innerHTML = `
    <div class="canvas-wrapper">
      <canvas id="studio-canvas"></canvas>
      <div class="studio-overlay">
        <span class="hero-tagline">AN INTIMATE SANCTUARY</span>
        <h2 class="hero-heading">The Noir Atelier Experience</h2>
        <p class="hero-description">Calacatta marble vanity stations, private botanical rinse suites, and champagne service curated for your serenity.</p>
        <div class="studio-highlights">
          <div class="highlight-chip">Private Bridal Suite</div>
          <div class="highlight-chip">Botanical Scalp Spa</div>
          <div class="highlight-chip">Champagne & Espresso Bar</div>
        </div>
      </div>
    </div>
  `;

  initCanvasScrub({
    cloudFolderDesktop: 'scene2-desktop',
    cloudFolderMobile: 'scene2-mobile',
    canvasId: 'studio-canvas',
    totalFrames: 180,
    pinDistance: '350%',
    triggerId: '#studio-tour',
    overlaySelector: '.studio-overlay'
  });
}
