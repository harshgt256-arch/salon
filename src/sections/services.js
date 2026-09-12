import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initServices() {
  const container = document.getElementById('services');
  if (!container) return;

  const servicesData = [
    {
      title: 'Hair Cut & Style',
      desc: 'Precision cuts and blowouts tailored to your face shape, hair texture, and personal style. From classic bobs to modern layers.',
      price: 'from £75',
      icon: '<path d="M14 6l4-4 4 4M21 3L3 21M7 10L3 6l4-4M3 21l8-8M13 11l4 4-4 4-4-4z"/>' // Abstract scissors/shear style
    },
    {
      title: 'Balayage & Colour',
      desc: 'Hand-painted balayage, full colour, highlights, and toning by our colour specialists. Every shade is custom-blended for you.',
      price: 'from £110',
      icon: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>' // Pallet/Color flow
    },
    {
      title: 'Bridal Hair',
      desc: 'Bridal and occasion updos, half-ups, and styling with a full trial appointment included. Your perfect look, rehearsed.',
      price: 'from £150',
      icon: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' // Elegant motif
    },
    {
      title: 'Face Spa',
      desc: 'Customised facial treatments using premium skincare: deep cleanse, exfoliation, mask, and massage. Your skin, transformed.',
      price: 'from £85',
      icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' // Water/care droplet
    },
    {
      title: 'Makeup',
      desc: 'Full glam, natural, and editorial makeup for every occasion. Long-wear formulas, airbrush available on request.',
      price: 'from £95',
      icon: '<path d="M12 2c1.66 0 3 1.34 3 3v2h-6V5c0-1.66 1.34-3 3-3zm-6 7h12a2 2 0 0 1 2 2v1l-3-3l-3 3l-3-3l-3 3v-1a2 2 0 0 1 2-2zM4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4H4z"/>' // Compact/Brush styled
    },
    {
      title: 'Lash & Brow',
      desc: 'Lash lift and tint, brow lamination, HD brows, and threading. Frame your face beautifully.',
      price: 'from £45',
      icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' // Eye line-icon
    }
  ];

  container.innerHTML = `
    <div class="services-wrapper">
      <div class="services-header">
        <h2 class="services-heading">Our Services</h2>
        <p class="services-subtext">Every service crafted for the woman who values herself</p>
      </div>

      <div class="services-grid" id="services-grid">
        ${servicesData.map(s => `
          <div class="service-card">
            <div class="service-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
                ${s.icon}
              </svg>
            </div>
            <h3 class="service-title">${s.title}</h3>
            <p class="service-desc">${s.desc}</p>
            <div class="service-footer">
              <span class="service-price">${s.price}</span>
              <a href="#cta" class="service-book">Book This &rarr;</a>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Stagger fade-up on scroll
  const cards = container.querySelectorAll('.service-card');
  if (cards.length > 0) {
    gsap.fromTo(cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#services-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  }
}
