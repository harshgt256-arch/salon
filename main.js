import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// 1. Initialize Smooth Scroll
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false, // Ensure native touch scrolling on mobile
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// 2. Constants & Assets
const CLOUD_NAME = 'j6f3st1w';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;

const SCENES = {
  hero: { id: 'scene1', total: 144, canvasId: 'hero-canvas', triggerId: '#hero' },
  showcase: { id: 'scene2', total: 180, canvasId: 'showcase-canvas', triggerId: '#showcase' }
};

const isMobile = () => window.innerWidth <= 768;

function getFrameUrl(sceneId, index, mobile) {
  const padIndex = String(index).padStart(4, '0');
  const type = mobile ? 'mobile' : 'desktop';
  // Optimization: add fetch format auto
  return `${BASE_URL}f_auto,q_auto/${sceneId}-${type}-${padIndex}.webp`;
}

// 3. Preloading Engine
function preloadScene(sceneId, total, onProgress, onComplete) {
  let loaded = 0;
  const images = [];
  const mobile = isMobile();

  for (let i = 0; i < total; i++) {
    const img = new Image();
    img.src = getFrameUrl(sceneId, i, mobile);
    img.onload = () => {
      loaded++;
      if (onProgress) onProgress(Math.round((loaded / total) * 100));
      if (loaded === total) onComplete(images);
    };
    // Handle error gracefully
    img.onerror = () => {
      loaded++;
      if (loaded === total) onComplete(images);
    };
    images.push(img);
  }
}

// 4. Canvas Drawing Engine
function drawCover(ctx, canvas, img) {
  if (!img) return;
  const hRatio = canvas.width / img.width;
  const vRatio = canvas.height / img.height;
  const ratio = Math.max(hRatio, vRatio);
  const centerShiftX = (canvas.width - img.width * ratio) / 2;
  const centerShiftY = (canvas.height - img.height * ratio) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img, 0, 0, img.width, img.height,
    centerShiftX, centerShiftY, img.width * ratio, img.height * ratio
  );
}

function initCanvasScrub(config, images) {
  const canvas = document.getElementById(config.canvasId);
  const ctx = canvas.getContext('2d', { alpha: false }); // Optimize performance

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawCover(ctx, canvas, images[frameObj.frame]);
  }

  window.addEventListener('resize', resize);

  const frameObj = { frame: 0 };

  // Initial draw
  resize();

  gsap.to(frameObj, {
    frame: config.total - 1,
    snap: 'frame',
    ease: 'none',
    scrollTrigger: {
      trigger: config.triggerId,
      start: 'top top',
      end: 'bottom bottom',
      scrub: isMobile() ? 1 : 0.5,
      onUpdate: () => {
        drawCover(ctx, canvas, images[Math.round(frameObj.frame)]);
      },
    },
  });

  // Optional: Add overlay animations
  const overlay = document.querySelector(`${config.triggerId} .overlay`);
  if (overlay) {
    gsap.to(overlay, {
      opacity: 0,
      y: -50,
      ease: 'power2.inOut',
      scrollTrigger: {
        trigger: config.triggerId,
        start: 'top top',
        end: 'center center',
        scrub: true
      }
    });
  }
}

// 5. Orchestration (Preload -> Init)
const progressFill = document.getElementById('progress-fill');
const preloader = document.getElementById('preloader');

// Preload Hero first to block page render
preloadScene(SCENES.hero.id, SCENES.hero.total,
  (percent) => {
    progressFill.style.width = `${percent}%`;
  },
  (heroImages) => {
    // Hide preloader
    preloader.style.opacity = '0';
    setTimeout(() => {
      preloader.style.display = 'none';
      document.body.style.overflowY = 'auto'; // Re-enable scroll if we locked it
    }, 800);

    // Init Hero Scene
    initCanvasScrub(SCENES.hero, heroImages);

    // Lazy load Showcase Scene in the background
    preloadScene(SCENES.showcase.id, SCENES.showcase.total, null, (showcaseImages) => {
      initCanvasScrub(SCENES.showcase, showcaseImages);
    });
  }
);

// Lock scroll while preloading
document.body.style.overflowY = 'hidden';

// 6. Booking Modal Logic
const modal = document.getElementById('booking-modal');
const bookBtn = document.getElementById('book-btn');
const closeBtn = document.querySelector('.close-btn');

bookBtn.addEventListener('click', () => {
  modal.classList.add('active');
  lenis.stop(); // Disable scrolling while modal is open
});

closeBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  lenis.start();
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
    lenis.start();
  }
});
