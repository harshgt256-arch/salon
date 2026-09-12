import { gsap } from 'gsap';

export function initTransformation() {
  const container = document.getElementById('transformation');
  if (!container) return;

  container.innerHTML = `
    <div class="transformation-wrapper">
      <!-- Header -->
      <div class="transformation-header">
        <span class="transformation-label">The Noir Difference</span>
        <h2 class="transformation-heading">Your Most Beautiful Self</h2>
        <p class="transformation-subtitle">Drag to reveal the transformation</p>
        <div class="drag-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"/>
          </svg>
        </div>
      </div>

      <!-- Before/After Slider -->
      <div class="ba-slider-container" id="ba-slider">
        <!-- AFTER Layer (bottom, full image visible) -->
        <div class="ba-layer ba-after">
          <img src="/after-hair.jpeg" alt="After transformation">
          <div class="ba-badge ba-badge-after">AFTER</div>
        </div>

        <!-- BEFORE Layer (top, clipped) -->
        <div class="ba-layer ba-before" id="ba-before">
          <img src="/before-hair.jpeg" alt="Before transformation">
          <div class="ba-badge ba-badge-before">BEFORE</div>
        </div>

        <!-- Divider Line -->
        <div class="ba-divider" id="ba-divider"></div>

        <!-- Handle -->
        <div class="ba-handle" id="ba-handle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M5 12l4-4M5 12l4 4M19 12l-4-4M19 12l-4 4"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  // Drag-reveal logic
  const slider = document.getElementById('ba-slider');
  const beforeLayer = document.getElementById('ba-before');
  const divider = document.getElementById('ba-divider');
  const handle = document.getElementById('ba-handle');

  if (!slider || !beforeLayer || !divider || !handle) return;

  let isDragging = false;
  let currentPercent = 50; // Start at 50%

  function updateSlider(clientX) {
    const rect = slider.getBoundingClientRect();
    let x = clientX - rect.left;
    let percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));

    currentPercent = percent;

    // Update clip-path on BEFORE layer (clip from right)
    beforeLayer.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;

    // Update divider position
    divider.style.left = `${percent}%`;

    // Update handle position
    handle.style.left = `${percent}%`;
  }

  function onStart(e) {
    isDragging = true;
    slider.style.cursor = 'col-resize';
    handle.classList.add('active');

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    updateSlider(clientX);
  }

  function onMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    updateSlider(clientX);
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    slider.style.cursor = 'col-resize';
    handle.classList.remove('active');

    // Add transition for smooth release
    beforeLayer.style.transition = 'clip-path 0.15s ease';
    setTimeout(() => {
      beforeLayer.style.transition = 'none';
    }, 150);
  }

  // Mouse events
  slider.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // Touch events
  slider.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onEnd);

  // Initialize at 50%
  updateSlider(slider.getBoundingClientRect().width / 2 + slider.getBoundingClientRect().left);

  // Animate arrow
  const arrow = container.querySelector('.drag-arrow svg');
  if (arrow) {
    gsap.to(arrow, {
      x: 6,
      duration: 0.9,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }
}
