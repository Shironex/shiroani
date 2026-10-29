import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import type { ModelUrls } from './manifest';

// three.js and R3F live behind this dynamic import, in their own chunk. It
// starts as soon as this module runs on a page that will show the 3D island,
// in parallel with hydration rather than after it.
const loadCanvas = () => import('./IslandCanvas');
const canvasChunk =
  typeof document !== 'undefined' && document.querySelector('[data-island]:not([data-static])')
    ? loadCanvas()
    : null;
// A failed chunk surfaces through the lazy component, not as an unhandled rejection.
canvasChunk?.catch(() => {});
const IslandCanvas = lazy(() => canvasChunk ?? loadCanvas());

/** Past this the island gives up on 3D and shows the poster instead of a stuck loader. */
const STATIC_FALLBACK_TIMEOUT_MS = 25_000;

interface Props {
  /** Models that have a real GLB in public/island/models, with their URLs. */
  models: ModelUrls;
}

/**
 * The 3D stage. Mounts the island unless the page decided on static mode
 * (phone width, reduced motion or no WebGL 2), drives the loader, and marks
 * the stage ready once the island is complete so the canvas fades in.
 */
export default function IslandStage({ models }: Props) {
  const anchor = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);

  // The static decision is made by an inline script before first paint, so
  // it is read from the DOM once the island hydrates.
  useEffect(() => {
    const root = anchor.current?.closest('[data-island]');
    const show = !!root && !root.hasAttribute('data-static');
    setRun(show);
    // The models start downloading as soon as the chunk is in, before the
    // canvas mounts. A failure here is left to the canvas to report.
    if (show) {
      (canvasChunk ?? loadCanvas()).then(
        chunk => chunk.preloadModels(models),
        () => {}
      );
    }
  }, [models]);

  // A failed chunk, a scene error or a request that never settles: go static,
  // which brings back the poster the page skipped for the loader.
  const fail = useCallback(() => {
    const root = anchor.current?.closest('[data-island]');
    if (!root || root.querySelector('[data-island-stage][data-ready]')) return;
    root.setAttribute('data-static', '');
    root.querySelector('[data-island-blank]')?.remove();
    setRun(false);
  }, []);

  const onCanvasError = useCallback(
    (error: unknown) => {
      console.warn('[island] 3D failed, showing the poster', error);
      fail();
    },
    [fail]
  );

  useEffect(() => {
    if (!run) return;
    const timer = window.setTimeout(fail, STATIC_FALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [run, fail]);

  const pctEl = useRef<Element | null>(null);
  const barEl = useRef<HTMLElement | null>(null);
  const onProgress = useCallback((percent: number) => {
    if (!pctEl.current || !barEl.current) {
      const stage = anchor.current?.closest('[data-island-stage]');
      pctEl.current = stage?.querySelector('[data-island-loader-pct]') ?? null;
      barEl.current = stage?.querySelector<HTMLElement>('[data-island-loader-bar]') ?? null;
    }
    const value = Math.round(percent);
    if (pctEl.current) pctEl.current.textContent = `${value}%`;
    if (barEl.current) barEl.current.style.transform = `scaleX(${value / 100})`;
  }, []);

  const onReady = useCallback(() => {
    const stage = anchor.current?.closest<HTMLElement>('[data-island-stage]');
    if (stage) stage.dataset.ready = '';
  }, []);

  return (
    <>
      {/* Fills the stage and anchors the closest() lookups above. The island
          hydrates on desktop widths only, so phones never fetch React. */}
      <div ref={anchor} className="island-anchor" />
      {run && (
        <ErrorBoundary fallback={null} onError={onCanvasError}>
          <Suspense fallback={null}>
            <IslandCanvas models={models} onProgress={onProgress} onReady={onReady} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}
