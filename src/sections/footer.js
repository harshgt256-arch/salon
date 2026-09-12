export function initFooter() {
  const container = document.getElementById('footer');
  if (!container) return;

  container.innerHTML = `
    <div class="footer-wrapper">
      <div class="footer-grid-main">

        <!-- Column 1: Brand -->
        <div class="footer-col footer-brand-col">
          <div class="footer-logo">
            <span class="footer-logo-mark">✤</span>NOIR STUDIO
          </div>
          <p class="footer-tagline">A Sanctuary for Women's Beauty</p>
          <div class="footer-socials">
            <a href="#" aria-label="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            <a href="#" aria-label="Pinterest">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="12" x2="12" y2="22"></line><line x1="12" y1="12" x2="18" y2="4"></line><line x1="12" y1="12" x2="6" y2="4"></line><circle cx="12" cy="12" r="10"></circle><path d="M12 12a4 4 0 0 0-4-4 4 4 0 0 0-4 4"></path></svg>
            </a>
            <a href="#" aria-label="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
            </a>
          </div>
        </div>

        <!-- Column 2: Services -->
        <div class="footer-col">
          <h4 class="footer-col-title">Services</h4>
          <a href="#services" class="footer-link">Hair Cut & Style</a>
          <a href="#services" class="footer-link">Balayage & Colour</a>
          <a href="#services" class="footer-link">Bridal Hair</a>
          <a href="#services" class="footer-link">Face Spa</a>
          <a href="#services" class="footer-link">Makeup</a>
          <a href="#services" class="footer-link">Lash & Brow</a>
        </div>

        <!-- Column 3: Studio -->
        <div class="footer-col">
          <h4 class="footer-col-title">Studio</h4>
          <a href="#stylists" class="footer-link">Meet the Team</a>
          <a href="#instagram" class="footer-link">Gallery</a>
          <a href="#pricing" class="footer-link">Pricing</a>
          <a href="#cta" class="footer-link">Book Now</a>
          <a href="#pricing" class="footer-link">Gift Vouchers</a>
        </div>

        <!-- Column 4: Newsletter -->
        <div class="footer-col footer-newsletter-col">
          <h4 class="footer-col-title">Beauty tips, seasonal offers, and new treatments</h4>
          <form class="footer-newsletter-form">
            <input type="email" placeholder="Your email address" required class="newsletter-input" />
            <button type="submit" class="newsletter-submit">Subscribe</button>
          </form>
        </div>

      </div>

      <!-- Bottom Row -->
      <div class="footer-bottom">
        <div class="footer-bottom-info">
          <p>Mon–Sat 9am–7pm · Sun 10am–5pm</p>
          <p class="footer-address">8440 Melrose Place, West Hollywood, CA 90069</p>
        </div>
        <div class="footer-legal">
          <p>&copy; ${new Date().getFullYear()} Noir Studio.</p>
          <div class="legal-links">
            <a href="#">Privacy</a>
            <span class="legal-sep">·</span>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
