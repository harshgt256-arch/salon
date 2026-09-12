import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initProcess() {
  const container = document.getElementById('process');
  if (!container) return;

  const steps = [
    {
      num: "01",
      title: "Consult",
      body: "We begin with you — your hair history, your lifestyle, your inspiration. We listen carefully before we pick up a single tool or mix a single shade."
    },
    {
      num: "02",
      title: "Design",
      body: "Your artist creates a bespoke plan for your look, walks you through every step, and answers every question. You approve before we begin."
    },
    {
      num: "03",
      title: "Create",
      body: "The experience itself — skilled hands, premium products, and unhurried attention. This is your time."
    },
    {
      num: "04",
      title: "Reveal",
      body: "The final blow-dry, the mirror reveal, and a personalised care routine so your look stays beautiful long after you leave us."
    }
  ];

  container.innerHTML = `
    <div class="process-wrapper">
      <div class="process-header">
        <h2 class="process-heading">Your Experience, Step by Step</h2>
      </div>

      <div class="process-timeline" id="process-timeline">
        <!-- Connecting Line Track -->
        <div class="process-line-track">
          <div class="process-line-fill" id="process-line-fill"></div>
        </div>

        <div class="process-steps-grid">
          ${steps.map((s, idx) => `
            <div class="process-step-item" id="process-step-${idx}">
              <div class="process-num-wrap">
                <span class="process-num">${s.num}</span>
              </div>
              <h3 class="process-step-title">${s.title}</h3>
              <p class="process-step-body">${s.body}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // ScrollTrigger Animation for the connecting line & steps fade-up
  const timelineEl = document.getElementById('process-timeline');
  const lineFill = document.getElementById('process-line-fill');
  const stepItems = container.querySelectorAll('.process-step-item');

  if (timelineEl && lineFill && stepItems.length > 0) {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: timelineEl,
        start: 'top 75%',
        end: 'bottom 60%',
        scrub: 0.8
      }
    });

    // Animate line from 0% to 100%
    tl.to(lineFill, {
      scaleX: 1,
      transformOrigin: 'left center',
      ease: 'none',
      duration: 1
    });

    // Stagger step reveals coordinated with the line
    stepItems.forEach((item, index) => {
      gsap.fromTo(item,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }
}
