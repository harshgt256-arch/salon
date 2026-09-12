import { gsap } from 'gsap';

export function initTestimonials() {
  const container = document.getElementById('testimonials');
  if (!container) return;

  const testimonials = [
    {
      stars: "★★★★★",
      quote: "I've been searching for someone who truly understands balayage for years. My colour has never looked this natural or this beautiful. I won't go anywhere else now.",
      name: "Priya S.",
      detail: "Balayage Client",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80"
    },
    {
      stars: "★★★★★",
      quote: "I came for a trim and left feeling completely transformed. The stylist didn't just cut my hair — she changed how I see myself. Truly magical.",
      name: "Sophie R.",
      detail: "New Client",
      photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80"
    },
    {
      stars: "★★★★★",
      quote: "My bridal hair and makeup were both done here and I have never felt so beautiful in my life. Every single bridesmaid ended up rebooking their own appointments.",
      name: "Amara T.",
      detail: "Bridal Client",
      photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"
    },
    {
      stars: "★★★★★",
      quote: "The facial is the most relaxing 60 minutes of my week. My skin hasn't looked this good in years. I come back every month without fail.",
      name: "Leila K.",
      detail: "Face Spa Regular",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
    }
  ];

  container.innerHTML = `
    <div class="testimonials-wrapper">
      <div class="testimonials-header">
        <h2 class="testimonials-heading">Stories from Our Clients</h2>
      </div>

      <div class="testimonial-carousel" id="testimonial-carousel">
        <div class="testimonial-slides">
          ${testimonials.map((t, idx) => `
            <div class="testimonial-slide ${idx === 0 ? 'active' : ''}" data-index="${idx}">
              <div class="testimonial-quote-wrap">
                <div class="testimonial-stars">${t.stars}</div>
                <blockquote class="testimonial-quote">"${t.quote}"</blockquote>
              </div>
              <div class="testimonial-author">
                <img src="${t.photo}" alt="${t.name}" class="testimonial-photo" />
                <div class="testimonial-info">
                  <div class="testimonial-name">${t.name}</div>
                  <div class="testimonial-detail">${t.detail}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Dot Indicators -->
        <div class="testimonial-dots">
          ${testimonials.map((_, idx) => `
            <button class="testimonial-dot ${idx === 0 ? 'active' : ''}" data-index="${idx}" aria-label="Go to testimonial ${idx + 1}"></button>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Carousel Logic
  const slides = container.querySelectorAll('.testimonial-slide');
  const dots = container.querySelectorAll('.testimonial-dot');
  const carouselEl = document.getElementById('testimonial-carousel');
  let currentIndex = 0;
  let autoAdvanceTimer = null;
  let isPaused = false;

  function showSlide(index) {
    // Remove active class from all
    slides.forEach(s => {
      s.classList.remove('active');
      s.style.visibility = 'hidden';
    });
    dots.forEach(d => d.classList.remove('active'));

    // Add active to current
    if (slides[index]) {
      slides[index].classList.add('active');
      slides[index].style.visibility = 'visible';
    }
    if (dots[index]) dots[index].classList.add('active');

    currentIndex = index;

    // Animate entrance
    const activeSlide = slides[index];
    if (activeSlide) {
      gsap.fromTo(activeSlide,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }

  function nextSlide() {
    const next = (currentIndex + 1) % slides.length;
    showSlide(next);
  }

  function startAutoAdvance() {
    stopAutoAdvance();
    if (!isPaused) {
      autoAdvanceTimer = setInterval(nextSlide, 7000);
    }
  }

  function stopAutoAdvance() {
    if (autoAdvanceTimer) {
      clearInterval(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
  }

  // Dot click handlers
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showSlide(idx);
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 1000);
    });
  });

  // Pause on hover
  if (carouselEl) {
    carouselEl.addEventListener('mouseenter', () => {
      isPaused = true;
      stopAutoAdvance();
    });
    carouselEl.addEventListener('mouseleave', () => {
      isPaused = false;
      startAutoAdvance();
    });
  }

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  if (carouselEl) {
    carouselEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe left
      nextSlide();
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 1000);
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe right
      const prev = (currentIndex - 1 + slides.length) % slides.length;
      showSlide(prev);
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 1000);
    }
  }

  // Start auto-advance
  startAutoAdvance();
}
