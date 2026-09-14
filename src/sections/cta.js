import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initCta() {
  const container = document.getElementById('cta');
  if (!container) return;

  container.innerHTML = `
    <div class="cta-wrapper">
      <!-- Parallax Glow Background -->
      <div class="cta-glow" id="cta-glow"></div>

      <!-- Content -->
      <div class="cta-content">
        <h2 class="cta-heading" data-reveal="lines">Ready to Feel Your Most Beautiful?</h2>
        <p class="cta-subtext" data-reveal-child>Book your experience today — new clients always welcome</p>

        <div class="cta-buttons">
          <button class="cta-btn cta-btn-primary" id="trigger-booking">Book Online</button>
          <a href="tel:+13105550000" class="cta-btn cta-btn-secondary">Call the Studio</a>
        </div>
      </div>
    </div>

    <!-- Booking Modal -->
    <div id="booking-modal" class="modal">
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <span class="close-btn" aria-label="Close modal">&times;</span>
        <h2 class="modal-title">Reserve Your Experience</h2>
        <p class="modal-subtitle">We will get back to you within 24 hours to confirm your appointment.</p>
        <form class="contact-form">
          <div class="form-group">
            <input type="text" placeholder="Full Name" required>
          </div>
          <div class="form-group">
            <input type="email" placeholder="Email Address" required>
          </div>
          <div class="form-group">
            <div class="select-wrapper">
              <select id="modal-service-select" required>
                <option value="">Select Primary Service</option>
                <option value="Hair Cut & Style">Hair Cut & Style</option>
                <option value="Balayage & Colour">Balayage & Colour</option>
                <option value="Bridal Hair">Bridal Suite</option>
                <option value="Face Spa">Face Spa & Skincare</option>
                <option value="Makeup">Makeup / Lash & Brow</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <textarea id="modal-notes" placeholder="Tell us about your hair or skin history..." rows="4"></textarea>
          </div>
          <button type="submit" class="modal-submit-btn">Submit Request &rarr;</button>
        </form>
      </div>
    </div>
  `;

  // Parallax glow effect
  const glow = document.getElementById('cta-glow');
  if (glow) {
    gsap.fromTo(glow,
      { y: -80, opacity: 0.5 },
      {
        y: 80,
        opacity: 0.8,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  }

  // Modal logic
  const modal = document.getElementById('booking-modal');
  const overlay = modal.querySelector('.modal-overlay');
  const triggerBtn = document.getElementById('trigger-booking');
  const closeBtn = container.querySelector('.close-btn');
  const modalContent = container.querySelector('.modal-content');
  const serviceSelect = document.getElementById('modal-service-select');
  const notesTextarea = document.getElementById('modal-notes');

  function openModal(preset = {}) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Concierge deep-linking preset
    if (preset.service && serviceSelect) {
      const match = Array.from(serviceSelect.options).find(opt => 
        opt.value.toLowerCase().includes(preset.service.toLowerCase()) || 
        preset.service.toLowerCase().includes(opt.value.toLowerCase())
      );
      if (match) serviceSelect.value = match.value;
    }
    if (preset.stylist && notesTextarea) {
      notesTextarea.value = `Preferred Artist: ${preset.stylist}\n`;
    }
    
    // Animate in
    gsap.fromTo(modalContent, 
      { y: 30, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }
    );
    gsap.fromTo(overlay,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );
  }

  function closeModal() {
    gsap.to(modalContent, {
      y: 20, opacity: 0, scale: 0.98, duration: 0.3, ease: 'power2.in'
    });
    gsap.to(overlay, {
      opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }

  // Global listener for booking triggers across the site
  document.addEventListener('click', (e) => {
    const bookLink = e.target.closest('a[href="#cta"], button[href="#cta"], .book-now, .hero-book-cta, .pricing-cta, .mobile-menu-cta, .stylist-book-btn');
    if (bookLink && !bookLink.id === 'trigger-booking') {
      const service = bookLink.dataset.service;
      const stylist = bookLink.dataset.stylist;
      openModal({ service, stylist });
    }
  });

  if (triggerBtn && modal) {
    triggerBtn.addEventListener('click', () => openModal());
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (overlay) {
    overlay.addEventListener('click', closeModal);
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}
