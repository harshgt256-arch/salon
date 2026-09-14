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
      img: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Stylist precision-cutting a client’s hair at a marble station'
    },
    {
      title: 'Balayage & Colour',
      desc: 'Hand-painted balayage, full colour, highlights, and toning by our colour specialists. Every shade is custom-blended for you.',
      price: 'from £110',
      img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Glossy balayage colour being painted freehand'
    },
    {
      title: 'Bridal Hair',
      desc: 'Bridal and occasion updos, half-ups, and styling with a full trial appointment included. Your perfect look, rehearsed.',
      price: 'from £150',
      img: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Bridal gown and veil prepared for the wedding morning'
    },
    {
      title: 'Face Spa',
      desc: 'Customised facial treatments using premium skincare: deep cleanse, exfoliation, mask, and massage. Your skin, transformed.',
      price: 'from £85',
      img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Relaxing facial spa treatment in a candlelit room'
    },
    {
      title: 'Makeup',
      desc: 'Full glam, natural, and editorial makeup for every occasion. Long-wear formulas, airbrush available on request.',
      price: 'from £95',
      img: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Artist applying editorial glam makeup'
    },
    {
      title: 'Lash & Brow',
      desc: 'Lash lift and tint, brow lamination, HD brows, and threading. Frame your face beautifully.',
      price: 'from £45',
      img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&h=600&q=80',
      alt: 'Curated cosmetics for lash and brow styling'
    }
  ];

  container.innerHTML = `
    <div class="services-wrapper">
      <div class="services-header">
        <h2 class="services-heading" data-reveal="lines">Our Services</h2>
        <p class="services-subtext" data-reveal-child>Every service crafted for the woman who values herself</p>
      </div>

      <div class="services-grid" id="services-grid">
        ${servicesData.map((s, i) => `
          <article class="service-card">
            <div class="service-media">
              <img
                class="service-img"
                src="${s.img}"
                alt="${s.alt}"
                loading="lazy"
                decoding="async"
              />
              <div class="service-veil"></div>
              <span class="service-price-tag">${s.price}</span>
              <span class="service-arrow" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </span>
            </div>

            <div class="service-body">
              <span class="service-num">0${i + 1}</span>
              <h3 class="service-title">${s.title}</h3>
              <p class="service-desc">${s.desc}</p>
              <button href="#cta" class="service-book" data-service="${s.title}">
                Book This
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;

  // Stagger fade-up on scroll
  const cards = container.querySelectorAll('.service-card');
  if (cards.length > 0) {
    gsap.fromTo(cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#services-grid',
          start: 'top 75%',
          toggleActions: 'play none none none'
        }
      }
    );
  }
}
