// The island page's own controls: the stop dots. Plain DOM, no three.js, so it
// runs in static mode too.
import { motion } from './motion';
import { scrollProgress, stopSections } from './scroll';

/** The dots step away once the island's bottom edge is above this share of the viewport. */
const AWAY_THRESHOLD = 0.75;

/** Sets up the stop dots. Safe to call on every page load. */
export function initIslandControls() {
  const root = document.querySelector<HTMLElement>('[data-island]');
  if (!root || root.dataset.controls !== undefined) return;
  root.dataset.controls = '';

  const sections = stopSections();
  const dots = [...document.querySelectorAll<HTMLAnchorElement>('[data-island-dot]')];
  let queued = false;
  let lastActive = -1;
  let lastAway: boolean | null = null;
  const update = () => {
    queued = false;
    // Layout reads first, then the writes.
    const p = scrollProgress(sections);
    const active = Math.min(Math.round(p), dots.length - 1);
    const away = root.getBoundingClientRect().bottom < window.innerHeight * AWAY_THRESHOLD;

    if (active !== lastActive) {
      dots.forEach((dot, i) => {
        if (i === active) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
      lastActive = active;
    }
    // Past the island the dots step away.
    if (away !== lastAway) {
      root.toggleAttribute('data-away', away);
      lastAway = away;
    }
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();

  dots.forEach((dot, i) => {
    dot.addEventListener('click', event => {
      event.preventDefault();
      const section = sections[i];
      if (!section) return;
      section.scrollIntoView({ behavior: motion.reduced ? 'auto' : 'smooth', block: 'start' });
      // Keyboard users land on the stop they picked, not back at the dots.
      section.focus({ preventScroll: true });
    });
  });

  // The client router swaps pages without a reload: the window listeners go
  // with the island.
  document.addEventListener(
    'astro:before-swap',
    () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
    },
    { once: true }
  );
}
