(() => {
  'use strict';
  const root = document.documentElement;
  // Prepare only the headline before paint. A missing/failed motion script must fail open.
  if (matchMedia('(prefers-reduced-motion: no-preference)').matches &&
      typeof Element.prototype.animate === 'function') {
    root.classList.add('intro-pending');
    setTimeout(() => root.classList.remove('intro-pending'), 800);
  }

  // Change reload behavior only; direct section links and Back/Forward retain their meaning.
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation?.type !== 'reload') return;

  const previousRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  root.classList.add('reload-to-top');
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);

  const goToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  goToTop();
  addEventListener('pageshow', () => {
    goToTop();
    requestAnimationFrame(() => {
      goToTop();
      root.classList.remove('reload-to-top');
      history.scrollRestoration = previousRestoration;
    });
  }, { once: true });
})();
