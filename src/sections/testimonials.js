import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
        <h2 class="testimonials-heading" data-reveal="lines">Stories from Our Clients</h2>
        <p class="testimonials-subtext" data-reveal-child>Real experiences from women who trust us with their beauty</p>
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
                <img src="${t.photo}" alt="${t.name}" class="testimonial-photo" loading="lazy" />
                <div class="testimonial-info">
                  <div class="testimonial-name">${t.name}</div>
                  <div class="testimonial-detail">${t.detail}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Navigation Arrows -->
        <button class="testimonial-nav testimonial-prev" aria-label="Previous testimonial">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button class="testimonial-nav testimonial-next" aria-label="Next testimonial">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

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
  const prevBtn = container.querySelector('.testimonial-prev');
  const nextBtn = container.querySelector('.testimonial-next');
  const carouselEl = document.getElementById('testimonial-carousel');
  let currentIndex = 0;
  let autoAdvanceTimer = null;
  let isPaused = false;

  function showSlide(index) {
    slides.forEach(s => {
      s.classList.remove('active');
      gsap.set(s, { opacity: 0, visibility: 'hidden' });
    });
    dots.forEach(d => d.classList.remove('active'));

    if (slides[index]) {
      slides[index].classList.add('active');
      gsap.set(slides[index], { visibility: 'visible' });
      gsap.fromTo(slides[index],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
      );
    }
    if (dots[index]) dots[index].classList.add('active');
    currentIndex = index;
  }

  function nextSlide() {
    const next = (currentIndex + 1) % slides.length;
    showSlide(next);
  }

  function prevSlide() {
    const prev = (currentIndex - 1 + slides.length) % slides.length;
    showSlide(prev);
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

  // Event handlers
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showSlide(idx);
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 2000);
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 2000);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      stopAutoAdvance();
      setTimeout(startAutoAdvance, 2000);
    });
  }

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
      const swipeThreshold = 50;
      if (touchEndX < touchStartX - swipeThreshold) {
        nextSlide();
        stopAutoAdvance();
        setTimeout(startAutoAdvance, 2000);
      }
      if (touchEndX > touchStartX + swipeThreshold) {
        prevSlide();
        stopAutoAdvance();
        setTimeout(startAutoAdvance, 2000);
      }
    }, { passive: true });
  }

  startAutoAdvance();

  // Scroll-triggered entrance animation
  gsap.fromTo('.testimonial-carousel',
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 75%',
        toggleActions: 'play none none none'
      }
    }
  );
}
