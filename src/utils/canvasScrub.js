import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CLOUD_NAME = 'j6f3st1w';
const BASE_URL = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`;

export function initCanvasScrub({
  cloudFolderDesktop = 'scene1-desktop',
  cloudFolderMobile = 'scene1-mobile',
  canvasId,
  totalFrames = 144,
  pinDistance = '1620px',
  textRevealAt = 0.85,
  triggerId = '#hero',
  isLocal = false,
  localFolder = '',
  onProgress,
  onReady
}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const isMobile = () => window.innerWidth < 768;
  const ctx = canvas.getContext('2d', { alpha: false });

  function getFrameUrl(index) {
    if (isLocal) {
      const padIndex = String(index + 1).padStart(4, '0');
      return `/frames/${localFolder}/frame_${padIndex}.png`;
    }
    const padIndex = String(index).padStart(4, '0');
    const folder = isMobile() ? cloudFolderMobile : cloudFolderDesktop;
    return `${BASE_URL}f_auto,q_auto/${folder}-${padIndex}.webp`;
  }

  const images = [];
  let loadedCount = 0;
  const frameObj = { frame: 0 };
  let isReady = false;

  function drawCover(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const hRatio = canvas.width / img.naturalWidth;
    const vRatio = canvas.height / img.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (canvas.width - img.naturalWidth * ratio) / 2;
    const centerShiftY = (canvas.height - img.naturalHeight * ratio) / 2;

    ctx.fillStyle = '#FDFAF5'; // --ivory fallback
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ensure high-quality rendering when upscaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      img, 0, 0, img.naturalWidth, img.naturalHeight,
      centerShiftX, centerShiftY, img.naturalWidth * ratio, img.naturalHeight * ratio
    );
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    // Set viewing size
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Wait! Do not scale ctx because `drawCover` uses the actual physical `canvas.width` directly.
    // This allows it to render at the native high-resolution without double-scaling issues.

    if (images[frameObj.frame]) {
      drawCover(images[frameObj.frame]);
    } else {
      ctx.fillStyle = '#FDFAF5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Load first frame immediately
  const firstImg = new Image();
  firstImg.crossOrigin = 'anonymous';
  firstImg.src = getFrameUrl(0);
  firstImg.onload = () => {
    images[0] = firstImg;
    drawCover(firstImg);
  };

  // Preload all frames
  for (let i = 0; i < totalFrames; i++) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getFrameUrl(i);

    const onFrameLoad = () => {
      loadedCount++;
      const percent = Math.min(100, Math.round((loadedCount / totalFrames) * 100));
      if (onProgress) onProgress(percent);

      if (i === 0) drawCover(img);

      if (loadedCount >= Math.min(15, totalFrames) && !isReady) {
        isReady = true;
        if (onReady) onReady();
      }
    };

    img.onload = onFrameLoad;
    img.onerror = onFrameLoad;
    images[i] = img;
  }

  // Fallback ready after 1.5s
  setTimeout(() => {
    if (!isReady) {
      isReady = true;
      if (onReady) onReady();
    }
  }, 1500);

  // GSAP ScrollTrigger
  const triggerEl = document.querySelector(triggerId);
  if (!triggerEl) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: triggerEl,
      start: 'top top',
      end: pinDistance ? `+=${pinDistance}` : '+=1620px',
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const targetIndex = Math.min(
          totalFrames - 1,
          Math.max(0, Math.round(self.progress * (totalFrames - 1)))
        );
        frameObj.frame = targetIndex;
        if (images[targetIndex]) {
          drawCover(images[targetIndex]);
        }
      }
    }
  });

  // Text Reveal Timeline at textRevealAt (85%)
  const overlay = triggerEl.querySelector('.hero-content-reveal');
  if (overlay) {
    gsap.set(overlay, { opacity: 0, y: 24 });

    ScrollTrigger.create({
      trigger: triggerEl,
      start: 'top top',
      end: pinDistance ? `+=${pinDistance}` : '+=1620px',
      onUpdate: (self) => {
        if (self.progress >= textRevealAt) {
          gsap.to(overlay, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        } else {
          gsap.to(overlay, {
            opacity: 0,
            y: 24,
            duration: 0.4,
            ease: 'power2.in',
            overwrite: 'auto'
          });
        }
      }
    });
  }

  return { resize: resizeCanvas };
}
