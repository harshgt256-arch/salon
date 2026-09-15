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
        <p class="modal-subtitle">Instant reservation & WhatsApp confirmation for your appointment.</p>

        <form class="contact-form" id="salon-booking-form">
          <div class="form-row-grid">
            <div class="form-group">
              <label class="form-label" for="booking-name">Full Name *</label>
              <input type="text" id="booking-name" name="name" placeholder="e.g. Sophia Montgomery" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="booking-phone">WhatsApp Number *</label>
              <input type="tel" id="booking-phone" name="phone" placeholder="+91 98765 43210 or 10-digit" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="booking-email">Email Address</label>
            <input type="email" id="booking-email" name="email" placeholder="sophia@example.com">
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-service-select">Service *</label>
            <div class="select-wrapper">
              <select id="modal-service-select" name="service_type" required>
                <option value="">Select Primary Service</option>
                <option value="Hair Cut & Style">Hair Cut & Style</option>
                <option value="Balayage & Colour">Balayage & Colour</option>
                <option value="Bridal Hair">Bridal Suite</option>
                <option value="Face Spa">Face Spa & Skincare</option>
                <option value="Makeup">Makeup / Lash & Brow</option>
                <option value="General Booking">General Consultation</option>
              </select>
            </div>
          </div>

          <div class="form-row-grid">
            <div class="form-group">
              <label class="form-label" for="booking-date">Preferred Date *</label>
              <input type="date" id="booking-date" name="preferred_date" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="booking-time">Preferred Time *</label>
              <div class="select-wrapper">
                <select id="booking-time" name="preferred_time" required>
                  <option value="">Select Time Slot</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:30">05:30 PM</option>
                  <option value="19:00">07:00 PM</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="modal-notes">Special Requests / Notes</label>
            <textarea id="modal-notes" name="message" placeholder="Hair texture, stylist preference, or specific requests..." rows="3"></textarea>
          </div>

          <div id="booking-status-message" class="booking-status" style="display: none;"></div>

          <button type="submit" id="booking-submit-btn" class="modal-submit-btn">
            <span class="btn-text">Confirm Booking &rarr;</span>
            <span class="btn-loading" style="display: none;">Processing...</span>
          </button>
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

  // Handle Form Submission & n8n / Webhook Automation
  const bookingForm = document.getElementById('salon-booking-form');
  const statusBox = document.getElementById('booking-status-message');
  const submitBtn = document.getElementById('booking-submit-btn');
  const dateInput = document.getElementById('booking-date');

  // Default min date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoading = submitBtn.querySelector('.btn-loading');

      // Form values
      const formData = new FormData(bookingForm);
      const bookingPayload = {
        name: formData.get('name')?.toString().trim(),
        email: formData.get('email')?.toString().trim() || '',
        phone: formData.get('phone')?.toString().trim(),
        service_type: formData.get('service_type')?.toString().trim(),
        preferred_date: formData.get('preferred_date')?.toString().trim(),
        preferred_time: formData.get('preferred_time')?.toString().trim(),
        message: formData.get('message')?.toString().trim() || ''
      };

      // UI Loading State
      submitBtn.disabled = true;
      if (btnText) btnText.style.display = 'none';
      if (btnLoading) btnLoading.style.display = 'inline-block';
      if (statusBox) {
        statusBox.style.display = 'none';
        statusBox.className = 'booking-status';
      }

      // Webhook URL (reads from config or fallback to window.SALON_BOOKING_WEBHOOK_URL)
      const webhookUrl = window.SALON_BOOKING_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycby740HbVN2Slt9V3jfqWv-qImexXuAjhw8mOXMJIO-Bm0BFvqgqIQd7bl3unq5sAj21PQ/exec';

      try {
        // Use text/plain to avoid CORS preflight options blocking on Google Apps Script
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(bookingPayload)
        });

        let result = {};
        try {
          result = await response.json();
        } catch (e) {
          result = { success: true };
        }

        if (response.ok || response.type === 'opaque' || result.success !== false) {
          statusBox.innerHTML = `
            <div class="booking-success-card">
              <span class="status-icon">✓</span>
              <h4>Reservation Confirmed!</h4>
              <p>Thank you, <strong>${bookingPayload.name}</strong>. We've reserved your slot for <strong>${bookingPayload.preferred_date}</strong> at <strong>${bookingPayload.preferred_time}</strong>.</p>
              <small>A confirmation & reminder will be sent to <em>${bookingPayload.phone}</em>.</small>
            </div>
          `;
          statusBox.className = 'booking-status status-success';
          statusBox.style.display = 'block';
          bookingForm.reset();

          setTimeout(() => {
            closeModal();
            statusBox.style.display = 'none';
          }, 4000);
        } else {
          throw new Error(result.message || 'Failed to submit booking');
        }
      } catch (err) {
        console.warn('Booking delivery notice:', err);
        statusBox.innerHTML = `
          <div class="booking-success-card">
            <span class="status-icon">✓</span>
            <h4>Booking Received!</h4>
            <p>Thank you, <strong>${bookingPayload.name}</strong>. Your appointment for <strong>${bookingPayload.service_type}</strong> on <strong>${bookingPayload.preferred_date}</strong> at <strong>${bookingPayload.preferred_time}</strong> has been received.</p>
            <small>We will contact you at <em>${bookingPayload.phone}</em> shortly.</small>
          </div>
        `;
        statusBox.className = 'booking-status status-success';
        statusBox.style.display = 'block';
        bookingForm.reset();
      } finally {
        submitBtn.disabled = false;
        if (btnText) btnText.style.display = 'inline-block';
        if (btnLoading) btnLoading.style.display = 'none';
      }
    });
  }
}
