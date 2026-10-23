// Where the page is in the island's scroll, shared by the camera rig and the
// page's stop dots. The stops' layout is measured once and again on resize, so
// a scroll is arithmetic on scrollY with no layout reads. No three.js imports.

export interface IslandScroll {
  /** 0 at the first stop, 1 at the second, and so on. */
  progress: number;
  /** The island's bottom edge, in viewport pixels. */
  bottom: number;
}

type Listener = (scroll: Readonly<IslandScroll>) => void;

const state: IslandScroll = { progress: 0, bottom: 0 };
const listeners = new Set<Listener>();

let root: HTMLElement | null = null;
let sections: HTMLElement[] = [];
let observer: ResizeObserver | null = null;
/** Each stop's top, then the last stop's bottom, in page pixels. */
let edges: number[] = [];
let rootBottom = 0;

/** The current scroll state. Cheap enough to read every frame. */
export function readIslandScroll(): Readonly<IslandScroll> {
  return state;
}

/** Calls `listener` now and on every change. Returns the unsubscribe. */
export function subscribeIslandScroll(listener: Listener): () => void {
  connectIslandScroll();
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Starts tracking the island on this page. Safe to call more than once. */
export function connectIslandScroll() {
  if (root) return;
  root = document.querySelector<HTMLElement>('[data-island]');
  if (!root) return;
  sections = [...root.querySelectorAll<HTMLElement>('[data-island-stop]')];

  measure();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update, { passive: true });
  observer = new ResizeObserver(measure);
  observer.observe(root);
  // Late fonts and images move the stops without always resizing the island.
  document.fonts?.ready.then(measure);
  if (document.readyState !== 'complete') addEventListener('load', measure, { once: true });

  // The client router swaps pages without a reload: the listeners go with
  // the island.
  document.addEventListener('astro:before-swap', disconnect, { once: true });
}

function disconnect() {
  removeEventListener('scroll', update);
  removeEventListener('resize', update);
  removeEventListener('load', measure);
  observer?.disconnect();
  observer = null;
  listeners.clear();
  root = null;
  sections = [];
  edges = [];
}

function measure() {
  if (!root) return;
  const y = scrollY;
  edges = sections.map(s => s.getBoundingClientRect().top + y);
  const last = sections.at(-1);
  if (last) edges.push(edges[edges.length - 1] + last.offsetHeight);
  rootBottom = root.getBoundingClientRect().bottom + y;
  update();
}

function update() {
  const y = scrollY;
  state.progress = progressAt(y);
  state.bottom = rootBottom - y;
  for (const listener of listeners) listener(state);
}

function progressAt(y: number): number {
  const stops = edges.length - 1;
  if (stops < 2) return 0;
  for (let i = stops - 1; i >= 0; i--) {
    if (edges[i] <= y) {
      return Math.min(i + (y - edges[i]) / (edges[i + 1] - edges[i]), stops - 1);
    }
  }
  return 0;
}
