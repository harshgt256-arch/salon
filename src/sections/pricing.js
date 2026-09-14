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
          <div class="pricing-card ${pkg.featured ? 'featured' : ''}" id="pricing-card-${idx}">
            ${pkg.featured ? `<div class="pricing-badge">${pkg.badge}</div>` : ''}

            <h3 class="pricing-name">${pkg.name}</h3>
            <div class="pricing-price">${pkg.price}</div>
            <p class="pricing-desc">${pkg.desc}</p>

            <ul class="pricing-bullets">
              ${pkg.bullets.map(b => `
                <li>
                  <span class="bullet-check">✓</span>
                  ${b}
                </li>
              `).join('')}
            </ul>

            <a href="#cta" class="pricing-cta">Book This Package</a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
