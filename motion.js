(() => {
  'use strict';
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const targets = [...document.querySelectorAll(
    '.projects > .section-heading, .project, .all-work, ' +
    '.about-label, .about h2, .about-body, .contact-kicker, ' +
    '.contact h2, .contact-main, .contact-secondary, .footer'
  )];
  const active = new Set();
  const seen = new WeakSet();
  const pending = new Set();
  let observer;
  let stopped = false;
  let introStarted = false;

  function finishActive() {
    // Cancel releases the effect to the visible underlying CSS immediately.
    // Never resume a partially transparent entrance after a background-tab pause.
    root.classList.remove('intro-pending');
    active.forEach(animation => animation.cancel());
    active.clear();
  }

  function showAll() {
    stopped = true;
    finishActive();
    observer?.disconnect();
    pending.clear();
    targets.forEach(target => target.classList.remove('reveal-pending'));
  }

  if (reducedMotion.matches || typeof Element.prototype.animate !== 'function') {
    showAll();
    return;
  }

  function enter(target, { distance = 32, duration = mobile.matches ? 450 : 650, delay = 0 } = {}) {
    if (stopped || reducedMotion.matches || document.hidden) return;
    try {
      const frames = distance ? [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' }
      ] : [{ opacity: 0 }, { opacity: 1 }];
      const animation = target.animate(frames, {
        duration, delay, easing: 'cubic-bezier(.25, .46, .45, .94)', fill: 'backwards'
      });
      active.add(animation);
      const release = () => active.delete(animation);
      animation.addEventListener('finish', release, { once: true });
      animation.addEventListener('cancel', release, { once: true });
    } catch {
      // Underlying CSS is visible; animation failure must never strand hidden content.
      target.classList.remove('reveal-pending');
    }
  }

  function reveal(target, animate = true) {
    target.classList.remove('reveal-pending');
    observer?.unobserve(target);
    pending.delete(target);
    if (!pending.size) observer?.disconnect();
    if (seen.has(target)) return;
    seen.add(target);
    // The last element must not extend the document's scrollable overflow.
    // A translated footer changes maxScroll during its reveal and clamps the viewport.
    if (animate) enter(target, { distance: target.matches('.footer') ? 0 : mobile.matches ? 24 : 32 });
  }

  function startIntro() {
    if (introStarted || stopped) return;
    introStarted = true;
    const prepared = root.classList.contains('intro-pending');
    root.classList.remove('intro-pending');
    // If the fail-open watchdog has already shown the headline, never hide it again.
    if (!prepared) return;
    const hero = document.querySelector('.hero');
    if (!hero || hero.getBoundingClientRect().bottom <= 0) return;
    const lines = [...hero.querySelectorAll('.hero-line')];
    // The complete sequence lasts 650ms on desktop and 450ms on mobile.
    lines.forEach((line, index) => enter(line, {
      distance: mobile.matches ? 24 : 32,
      duration: mobile.matches ? 350 : 510,
      delay: index * (mobile.matches ? 50 : 70)
    }));
    const bottom = hero.querySelector('.hero-bottom');
    if (bottom) enter(bottom, { distance: 16 });
  }

  // Let the browser and startup.js finish hash/scroll restoration before observing blocks.
  const positionReady = new Promise(resolve => {
    const afterPosition = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
    if (document.readyState === 'complete') afterPosition();
    else addEventListener('pageshow', afterPosition, { once: true });
  });
  // Wait for the actual typeface, with a short upper bound; never add a loading screen.
  const fontReady = document.fonts?.ready ?? Promise.resolve();
  Promise.all([
    positionReady,
    Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 180))])
  ])
    .then(startIntro)
    .catch(startIntro);

  positionReady.then(() => {
    if (stopped || reducedMotion.matches || !('IntersectionObserver' in window)) return;
    try {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      }, { rootMargin: '0px 0px -24px 0px', threshold: 0.06 });
      // Read layout in one batch before writing pending classes.
      const positions = targets.map(target => target.getBoundingClientRect());
      targets.forEach((target, index) => {
        const rect = positions[index];
        // Already visible on entry (e.g. direct section links) stays readable without a flash.
        if ((rect.bottom > 0 && rect.top < innerHeight - 24) || target.contains(document.activeElement)) {
          seen.add(target);
          return;
        }
        target.classList.add('reveal-pending');
        pending.add(target);
        observer.observe(target);
      });
    } catch {
      // Keep the independently prepared headline working when scroll observation is unavailable.
      observer?.disconnect();
      targets.forEach(target => target.classList.remove('reveal-pending'));
    }
  });

  // Keyboard navigation never lands on an invisible link or waits for a reveal.
  document.addEventListener('focusin', event => {
    const target = event.target.closest?.('.reveal-pending');
    if (target) reveal(target, false);
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) showAll();
  });
  addEventListener('beforeprint', showAll);
  // Browser scroll/compositor restoration can happen after visibilitychange.
  // Release ALL hidden blocks on departure, not just the old viewport's blocks.
  // Entrances run on the initial visit; a resumed page stays fully readable.
  document.addEventListener('visibilitychange', showAll);
  addEventListener('blur', showAll);
  addEventListener('pageshow', event => {
    if (event.persisted) showAll();
  });
})();
