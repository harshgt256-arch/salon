import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initFaq() {
  const container = document.getElementById('faq');
  if (!container) return;

  const faqs = [
    {
      q: "How far ahead should I book?",
      a: "For hair appointments, 1–2 weeks is usually fine. For bridal hair and makeup, we recommend booking 6–12 months in advance to secure your date. Colour appointments with our senior specialists book 3–4 weeks ahead."
    },
    {
      q: "Do you offer a bridal trial?",
      a: "Yes — every bridal booking includes a full trial appointment. We strongly recommend it at least 6–8 weeks before your wedding day so there's time for any adjustments."
    },
    {
      q: "What should I do before my colour appointment?",
      a: "Come with clean hair free of heavy styling products, but don't over-wash it — natural oils protect your scalp during the colour process. Avoid applying hair masks or oils the night before."
    },
    {
      q: "Do you cater for all hair types and textures?",
      a: "Yes — our stylists are trained across straight, wavy, curly, and coily textures. Please mention your hair type when booking so we can match you with the right specialist."
    },
    {
      q: "What skincare should I avoid before a facial?",
      a: "Avoid retinol, AHAs, BHAs, and any active exfoliants for 48 hours before your face spa appointment. Come with clean skin and no makeup if possible."
    },
    {
      q: "Do you offer gift vouchers?",
      a: "Yes — Noir Studio gift vouchers are available in any value, in digital or printed format. The perfect gift for someone you love."
    }
  ];

  container.innerHTML = `
    <div class="faq-wrapper">
      <div class="faq-header">
        <h2 class="faq-heading" data-reveal="lines">Your Questions</h2>
        <p class="faq-subtext" data-reveal-child>Everything you need to know about your appointment</p>
      </div>

      <div class="faq-accordion">
        ${faqs.map((faq, idx) => `
          <div class="faq-item" data-index="${idx}">
            <button class="faq-question">
              <span>${faq.q}</span>
              <span class="faq-icon">+</span>
            </button>
            <div class="faq-answer">
              <p>${faq.a}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Accordion logic with smooth animation
  const items = container.querySelectorAll('.faq-item');

  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all other items
      items.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('open');
          const otherAnswer = otherItem.querySelector('.faq-answer');
          const otherIcon = otherItem.querySelector('.faq-icon');
          if (otherAnswer) otherAnswer.style.maxHeight = '0';
          if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
        }
      });

      // Toggle current item
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        icon.style.transform = 'rotate(45deg)';
      } else {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
        icon.style.transform = 'rotate(0deg)';
      }
    });
  });

  // Scroll entrance
  if (items.length > 0) {
    gsap.fromTo(items,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.faq-accordion',
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  }
}
