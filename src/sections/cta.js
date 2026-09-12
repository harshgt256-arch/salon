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
        <h2 class="cta-heading">Ready to Feel Your Most Beautiful?</h2>
        <p class="cta-subtext">Book your experience today — new clients always welcome</p>

        <div class="cta-buttons">
          <button class="cta-btn cta-btn-primary" id="trigger-booking">Book Online</button>
          <a href="tel:+13105550000" class="cta-btn cta-btn-secondary">Call the Studio</a>
        </div>
      </div>
    </div>

    <!-- Booking Modal -->
    <div id="booking-modal" class="modal">
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2 class="modal-title">Reserve Your Experience</h2>
        <form class="contact-form">
          <input type="text" placeholder="Full Name" required>
          <input type="email" placeholder="Email Address" required>
          <select required>
            <option value="">Select Primary Service</option>
            <option>Hair Cut & Styling</option>
            <option>Balayage & Colour</option>
            <option>Bridal Suite</option>
            <option>Face Spa & Skincare</option>
            <option>Makeup / Lash & Brow</option>
          </select>
          <textarea placeholder="Tell us about your hair or skin history..." rows="4"></textarea>
          <button type="submit" class="btn btn-gold btn-full mt-4" style="height: 54px;">Submit Request</button>
        </form>
      </div>
    </div>
  `;

  // Parallax glow effect
  const glow = document.getElementById('cta-glow');
  if (glow) {
    gsap.fromTo(glow,
      { y: -100 },
      {
        y: 100,
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
  const triggerBtn = document.getElementById('trigger-booking');
  const closeBtn = container.querySelector('.close-btn');

  if(triggerBtn && modal) {
    triggerBtn.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }
  if(closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
}
