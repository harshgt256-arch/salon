import { gsap } from 'gsap';

export function initPreloader(onComplete) {
  // Create preloader element if not present
  let preloader = document.getElementById('noir-preloader');
  if (!preloader) {
    preloader = document.createElement('div');
    preloader.id = 'noir-preloader';
    preloader.innerHTML = `
      <div class="preloader-inner">
        <div class="preloader-logo">
          <span class="preloader-mark">✤</span>NOIR STUDIO
        </div>
        <p class="preloader-subtext">A Sanctuary for Women's Beauty</p>
        <div class="preloader-line"></div>
      </div>
    `;
    document.body.prepend(preloader);
  }

  // Initial animation
  const tl = gsap.timeline();

  tl.to('.preloader-logo', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    delay: 0.1
  })
  .to('.preloader-subtext', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    ease: 'power2.out'
  }, '-=0.5')
  .to('.preloader-line', {
    width: '140px',
    duration: 0.8,
    ease: 'power2.inOut'
  }, '-=0.4');

  // Dismiss function
  const dismiss = () => {
    const exitTl = gsap.timeline({
      onComplete: () => {
        if (preloader) preloader.style.display = 'none';
        if (onComplete) onComplete();
      }
    });

    exitTl
      .to('.preloader-inner', {
        opacity: 0,
        y: -20,
        duration: 0.6,
        ease: 'power2.in'
      })
      .to(preloader, {
        yPercent: -100,
        duration: 1.1,
        ease: 'power4.inOut'
      }, '-=0.2')
      .from('.fixed-nav', {
        y: -40,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out'
      }, '-=0.6');
  };

  // Auto-dismiss after slight pause so user experiences the luxury entrance
  setTimeout(() => {
    dismiss();
  }, 1400);
}
