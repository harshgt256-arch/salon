export function initTrustBar() {
  const container = document.getElementById('trust-bar');
  if (!container) return;

  container.innerHTML = `
    <div class="trust-bar-wrapper">
      <!-- Top Row: Credibility Badges -->
      <div class="badges-row">
        <div class="badge-item" style="--stagger: 0">
          <div class="badge-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 2l2.5 7.5h8l-6.5 5 2.5 7.5-6.5-5-6.5 5 2.5-7.5-6.5-5h8L16 2z"/>
            </svg>
          </div>
          <span class="badge-label">10+ Years of Beauty</span>
        </div>
        <div class="badge-item" style="--stagger: 1">
          <div class="badge-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 28C8.3 28 2 21.7 2 14c0-5.5 3.5-10.2 8.4-12 .8-.3 1.7.1 1.9 1l1.8 5.7c.2.6.8.9 1.4.8l2.5-.5 2.5.5c.6.1 1.2-.2 1.4-.8l1.8-5.7c.2-.9 1.1-1.3 1.9-1C26.5 3.8 30 8.5 30 14c0 7.7-6.3 14-14 14z"/>
            </svg>
          </div>
          <span class="badge-label">2,000+ Happy Clients</span>
        </div>
        <div class="badge-item" style="--stagger: 2">
          <div class="badge-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 2l3 9h9l-7.5 5.5 3 9-7.5-5.5-7.5 5.5 3-9L4 11h9l3-9z"/>
            </svg>
          </div>
          <span class="badge-label">Award-Winning Stylists</span>
        </div>
        <div class="badge-item" style="--stagger: 3">
          <div class="badge-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M16 2l4 8 9 1-7 5 2 9-8-5-8 5 2-9-7-5 9-1 4-8z"/>
            </svg>
          </div>
          <span class="badge-label">Vogue & Elle Featured</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="trust-divider"></div>

      <!-- Bottom Row: Press Marquee -->
      <div class="press-marquee-wrapper">
        <div class="press-marquee">
          <div class="press-item">VOGUE</div>
          <div class="press-separator">/</div>
          <div class="press-item">HARPER'S BAZAAR</div>
          <div class="press-separator">/</div>
          <div class="press-item">ELLE</div>
          <div class="press-separator">/</div>
          <div class="press-item">GRAZIA</div>
          <div class="press-separator">/</div>
          <div class="press-item">BRIDES MAGAZINE</div>

          <!-- Duplicate for seamless loop -->
          <div class="press-item">VOGUE</div>
          <div class="press-separator">/</div>
          <div class="press-item">HARPER'S BAZAAR</div>
          <div class="press-separator">/</div>
          <div class="press-item">ELLE</div>
          <div class="press-separator">/</div>
          <div class="press-item">GRAZIA</div>
          <div class="press-separator">/</div>
          <div class="press-item">BRIDES MAGAZINE</div>
        </div>
      </div>
    </div>
  `;
}
