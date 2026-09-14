import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initPricing() {
  const container = document.getElementById('pricing');
  if (!container) return;

  const packages = [
    {
      name: "The Essentials",
      price: "£95",
      desc: "Hair cut, blowdry and style. The perfect weekly treat.",
      bullets: [
        "Personal consultation",
        "Precision cut",
        "Blowdry & finish"
      ],
      featured: false
    },
    {
      name: "The Signature",
      price: "£210",
      desc: "Balayage or full colour, precision cut, blowdry, and a personalised home care plan.",
      bullets: [
        "Colour consultation",
        "Balayage or full colour",
        "Toning & gloss",
        "Precision cut",
        "Blowdry & finish",
        "Personalised care plan"
      ],
      featured: true,
      badge: "MOST LOVED"
    },
    {
      name: "The Luxe Edit",
      price: "£380",
      desc: "The full Noir Studio experience — colour, cut, lash lift, brow lamination, and a 60-minute face spa treatment.",
      bullets: [
        "All Signature inclusions",
        "Lash lift & tint",
        "Brow lamination",
        "60-minute face spa",
        "Complimentary hand treatment"
      ],
      featured: false
    }
  ];

  container.innerHTML = `
    <div class="pricing-wrapper">
      <div class="pricing-header">
        <h2 class="pricing-heading" data-reveal="lines">Treat Yourself</h2>
        <p class="pricing-subtext" data-reveal-child>Every package includes a personal consultation and finishing styling</p>
      </div>

      <div class="pricing-grid">
        ${packages.map((pkg, idx) => `
          <div class="pricing-card ${pkg.featured ? 'featured' : ''}" data-index="${idx}">
            ${pkg.featured ? `<div class="pricing-badge">${pkg.badge}</div>` : ''}

            <h3 class="pricing-name">${pkg.name}</h3>
            <div class="pricing-price">${pkg.price}</div>
            <p class="pricing-desc">${pkg.desc}</p>

            <ul class="pricing-bullets">
              ${pkg.bullets.map(b => `
                <li>
                  <svg class="bullet-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span>${b}</span>
                </li>
              `).join('')}
            </ul>

            <button href="#cta" class="pricing-cta" data-service="${pkg.name}">Book This Package</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Stagger card entrance
  const cards = container.querySelectorAll('.pricing-card');
  if (cards.length > 0) {
    gsap.fromTo(cards,
      { opacity: 0, y: 40, scale: 0.98 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.pricing-grid',
          start: 'top 75%',
          toggleActions: 'play none none none'
        }
      }
    );
  }
}
