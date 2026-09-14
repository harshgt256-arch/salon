import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initStylists() {
  const container = document.getElementById('stylists');
  if (!container) return;

  const stylistsData = [
    {
      name: "Elena Vance",
      title: "Senior Hair Colourist — Balayage & Bridal Specialist",
      bio: "12 years · Specialises in blondes and bespoke colour journeys",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Chloe Martin",
      title: "Creative Hair Director — Cuts, Texture & Transformation",
      bio: "9 years · Known for her signature lived-in cuts",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Sophia Laurent",
      title: "Beauty Artist — Makeup, Lash & Brow Specialist",
      bio: "7 years · Bridal and editorial beauty expert",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80"
    }
  ];

  container.innerHTML = `
    <div class="stylists-wrapper">
      <div class="stylists-header">
        <h2 class="stylists-heading" data-reveal="lines">Meet Your Artists</h2>
        <p class="stylists-subtext" data-reveal-child>Specialists who listen, create, and care</p>
      </div>

      <div class="stylists-grid">
        ${stylistsData.map(s => `
          <div class="stylist-card">
            <div class="stylist-photo-wrap">
              <img src="${s.image}" alt="${s.name}" class="stylist-photo" />
            </div>
            <div class="stylist-content">
              <h3 class="stylist-name">${s.name}</h3>
              <p class="stylist-title">${s.title}</p>
              <p class="stylist-bio">${s.bio}</p>
              <div class="stylist-actions">
                <a href="#instagram" class="stylist-portfolio-link">View Portfolio &rarr;</a>
                <a href="#cta" class="stylist-book-btn">Book with ${s.name.split(' ')[0]} &rarr;</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add stagger animation on scroll
  const cards = container.querySelectorAll('.stylist-card');
  if (cards.length > 0) {
    gsap.fromTo(cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.stylists-grid',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  }
}
