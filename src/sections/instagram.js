export function initInstagram() {
  const container = document.getElementById('instagram');
  if (!container) return;

  const posts = [
    {
      img: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Balayage results",
      likes: "542"
    },
    {
      img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Silk blowout",
      likes: "819"
    },
    {
      img: "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Bridal updo",
      likes: "630"
    },
    {
      img: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Lash and brow lamination",
      likes: "412"
    },
    {
      img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Face spa treatment",
      likes: "975"
    },
    {
      img: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&h=600&q=80",
      alt: "Editorial glam makeup",
      likes: "724"
    }
  ];

  container.innerHTML = `
    <div class="instagram-wrapper">
      <div class="instagram-header">
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="instagram-handle">@noirstudio</a>
      </div>

      <div class="instagram-grid">
        ${posts.map(p => `
          <div class="instagram-card">
            <img src="${p.img}" alt="${p.alt}" class="instagram-img" />
            <div class="instagram-overlay">
              <div class="instagram-likes">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>${p.likes}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
