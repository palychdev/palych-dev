// Desktop wheel enhancement. No dependency download or animation loop on phones.
const desktop = matchMedia('(min-width: 701px) and (pointer: fine)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let lenis;
let frame = 0;
let lastTime = 0;
let clock = 1;
let generation = 0;
let pageActive = true;

function cancelFrame() {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
}

function tick(time) {
  frame = 0;
  if (!lenis || document.hidden) return;
  // Freeze the supplied clock while idle, so a new wheel event cannot jump
  // straight to its destination after a long pause. Only use the public raf API.
  if (lastTime) clock += Math.min(time - lastTime, 64);
  lastTime = time;
  lenis.raf(clock);
  if (lenis.isScrolling === 'smooth') frame = requestAnimationFrame(tick);
  else lastTime = 0;
}

function wake() {
  if (lenis && !frame && !document.hidden) frame = requestAnimationFrame(tick);
}

function settle() {
  cancelFrame();
  if (lenis && !lenis.isStopped) lenis.scrollTo(window.scrollY, { immediate: true });
}

async function configure() {
  const request = ++generation;
  cancelFrame();
  lenis?.destroy();
  lenis = undefined;
  if (!pageActive || document.hidden || !desktop.matches || reduced.matches) return;
  try {
    const { default: Lenis } = await import('./assets/vendor/lenis/lenis.mjs');
    if (request !== generation || !pageActive || document.hidden || !desktop.matches || reduced.matches) return;
    lenis = new Lenis({
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      autoRaf: false
    });
    lenis.on('virtual-scroll', ({ event }) => {
      if (event.type === 'wheel') wake();
    });
    if (document.querySelector('dialog[open]')) lenis.stop();
  } catch {
    // Native wheel scrolling and CSS anchor scrolling remain fully usable.
    lenis?.destroy();
    lenis = undefined;
  }
}

document.addEventListener('click', event => {
  if (!lenis || lenis.isStopped || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('a[href^="#"]');
  if (!link || link.classList.contains('skip-link') || link.hasAttribute('download') ||
      (link.target && link.target !== '_self')) return;
  let target;
  try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
  if (!target) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  lenis.resize();
  lenis.scrollTo(link.hash === '#top' ? 0 : target, {
    onComplete: () => {
      // Match native anchor focus, including keyboard navigation after arrival.
      const temporary = !target.hasAttribute('tabindex');
      if (temporary) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (temporary) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
  });
  wake();
});

document.addEventListener('portfolio:dialog-open', () => {
  cancelFrame();
  lenis?.stop();
});
document.addEventListener('portfolio:dialog-close', () => {
  lenis?.start();
  lenis?.resize();
});
document.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab'].includes(event.key)) settle();
});
// Release the old engine on departure. Returning creates fresh state from the
// browser's actual position, with no paused inertia/clock to resume.
document.addEventListener('visibilitychange', configure);
addEventListener('blur', settle);
addEventListener('popstate', settle);
addEventListener('hashchange', settle);
addEventListener('pagehide', () => {
  pageActive = false;
  generation++;
  cancelFrame();
  lenis?.destroy();
  lenis = undefined;
});
addEventListener('pageshow', event => {
  pageActive = true;
  if (event.persisted) configure();
});
desktop.addEventListener('change', configure);
reduced.addEventListener('change', configure);
configure();
