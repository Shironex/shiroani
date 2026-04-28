/**
 * Script builders for OP/ED skip injection into player iframes.
 *
 * This module owns all JavaScript template strings that run inside player
 * iframes. Each builder returns a self-contained IIFE string ready for
 * `WebFrameMain.executeJavaScript()`.
 *
 * Two public builders:
 *
 *   buildFallbackButtonScript({ deltaSeconds })
 *     Persistent "+Ns skip" button — shown when AniSkip has no data or when
 *     MAL ID resolution failed. Idempotent: replaces on re-injection.
 *
 *   buildSkipToastScript({ skipTimes, autoSkipEnabled })
 *     Contextual toast — polls currentTime every 500ms, shows the toast 5s
 *     before each OP/ED window, seeks on click (or auto-seeks when
 *     autoSkipEnabled is true). Idempotent: replaces on re-injection.
 *
 * Shared infrastructure used by both:
 *   - COLLECT_VIDEOS_FN_SOURCE  — shadow-DOM-aware <video> collector
 *   - PROBE_VIDEOS_SOURCE       — IIFE snapshot of all videos (for diagnostics)
 *   - Fullscreen reparenting     — keeps the injected element visible in
 *                                  HTML5 fullscreen by moving it into the
 *                                  fullscreen element
 *   - Sentinel attributes        — idempotency via data-shiroani-* attributes
 */

/**
 * Shadow-DOM-piercing video collector injected into every script.
 * Exported so callers outside this module can embed it when needed
 * (e.g. findPlayingVideoFrame).
 */
export const COLLECT_VIDEOS_FN_SOURCE = `
function shiroaniCollectVideos(root) {
  const found = new Set();
  const queue = [root || document];
  while (queue.length) {
    const node = queue.shift();
    if (!node) continue;
    if (node.querySelectorAll) {
      for (const v of node.querySelectorAll('video')) found.add(v);
      for (const el of node.querySelectorAll('*')) {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      }
    }
  }
  return Array.from(found);
}
`;

/**
 * IIFE that returns the state of every <video> in the frame's document +
 * shadow roots. Serialisable — safe to return across the IPC boundary.
 * Exported for the POC probe diagnostic.
 */
export const PROBE_VIDEOS_SOURCE = `
(() => {
  ${COLLECT_VIDEOS_FN_SOURCE}
  const videos = shiroaniCollectVideos(document);
  return videos.map(v => ({
    width: v.videoWidth | 0,
    height: v.videoHeight | 0,
    currentTime: typeof v.currentTime === 'number' ? v.currentTime : 0,
    duration: typeof v.duration === 'number' && isFinite(v.duration) ? v.duration : 0,
    paused: !!v.paused,
    src: v.currentSrc || v.src || '',
    playing: (v.videoWidth | 0) > 0 && (typeof v.currentTime === 'number' && v.currentTime > 0) && !v.paused,
  }));
})()
`;

/** Shared fullscreen reparenting snippet — bound once per `window`. */
const FULLSCREEN_REPARENT_SOURCE = (sentinelAttr: string) => `
  const reparentForFullscreen = () => {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    const wrapEl = document.querySelector('[${sentinelAttr}="wrap"]');
    if (!wrapEl) return;
    if (fs && !fs.contains(wrapEl)) {
      fs.appendChild(wrapEl);
    } else if (!fs && wrapEl.parentElement !== document.body && document.body) {
      document.body.appendChild(wrapEl);
    }
  };
  if (!window.__shiroaniSkipFsBound) {
    window.__shiroaniSkipFsBound = true;
    document.addEventListener('fullscreenchange', reparentForFullscreen);
    document.addEventListener('webkitfullscreenchange', reparentForFullscreen);
  }
  reparentForFullscreen();
`;

/**
 * Builds a persistent "+Ns skip" fallback button script.
 *
 * Shown when AniSkip has no data for the current episode or when MAL ID
 * resolution fails. Clicking seeks the largest playing video forward by
 * `deltaSeconds`.
 *
 * The button uses attribute `data-shiroani-skip-poc` for historical
 * backwards-compat with the POC dock's Wstrzyknij flow.
 */
export function buildFallbackButtonScript(deltaSeconds: number): string {
  const delta = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
  const deltaLiteral = JSON.stringify(delta);
  const ATTR = 'data-shiroani-skip-poc';

  return `
    (() => {
      const SHIROANI_ATTR = '${ATTR}';
      document.querySelectorAll('[' + SHIROANI_ATTR + ']').forEach(n => n.remove());

      const wrap = document.createElement('div');
      wrap.setAttribute(SHIROANI_ATTR, 'wrap');
      wrap.style.cssText = [
        'all: initial',
        'position: fixed',
        'right: 24px',
        'bottom: 72px',
        'z-index: 2147483647',
        'font-family: system-ui, -apple-system, "Segoe UI", sans-serif',
        'font-size: 13px',
        'pointer-events: auto',
      ].join(';');

      const btn = document.createElement('button');
      btn.setAttribute(SHIROANI_ATTR, 'btn');
      btn.textContent = '⏭ Pomiń +' + (${deltaLiteral}) + 's';
      btn.style.cssText = [
        'all: initial',
        'cursor: pointer',
        'padding: 10px 14px',
        'border-radius: 9px',
        'background: rgba(20, 14, 24, 0.85)',
        'color: white',
        'font-weight: 600',
        'font-size: 13px',
        'box-shadow: 0 6px 20px rgba(0,0,0,0.45)',
        'border: 1px solid rgba(255,255,255,0.15)',
        'font-family: inherit',
      ].join(';');

      btn.addEventListener('click', () => {
        ${COLLECT_VIDEOS_FN_SOURCE}
        const videos = shiroaniCollectVideos(document)
          .filter(v => (v.videoWidth | 0) > 0 && v.currentTime > 0);
        videos.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight));
        if (videos[0]) {
          videos[0].currentTime = videos[0].currentTime + (${deltaLiteral});
        }
      });

      wrap.appendChild(btn);
      (document.body || document.documentElement).appendChild(wrap);

      ${FULLSCREEN_REPARENT_SOURCE(ATTR)}

      return {
        ok: true,
        host: location.host,
        hasBody: !!document.body,
        wasFullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
      };
    })()
  `;
}

export interface SkipWindow {
  startTime: number;
  endTime: number;
  label: string;
}

/**
 * Builds the contextual skip toast script.
 *
 * Polls `currentTime` every 500ms. When the current time is within 5s before
 * a skip window start, shows a toast with a countdown. Clicking seeks to the
 * window end. If `autoSkipEnabled` is true, seeks automatically at `startTime`
 * without requiring a click. Toast dismisses automatically after the window ends.
 *
 * Idempotent: replaces any existing skip toast on re-injection.
 */
export function buildSkipToastScript(params: {
  skipWindows: SkipWindow[];
  autoSkipEnabled: boolean;
}): string {
  const { skipWindows, autoSkipEnabled } = params;
  const windowsJson = JSON.stringify(skipWindows);
  const autoSkipLiteral = JSON.stringify(autoSkipEnabled);
  const ATTR = 'data-shiroani-skip';

  return `
    (() => {
      const SHIROANI_ATTR = '${ATTR}';
      const SKIP_WINDOWS = ${windowsJson};
      const AUTO_SKIP = ${autoSkipLiteral};
      const PRE_SHOW_SECS = 5;

      // Idempotency — remove existing root on re-injection
      document.querySelectorAll('[' + SHIROANI_ATTR + ']').forEach(n => n.remove());
      if (window.__shiroaniSkipInterval) {
        clearInterval(window.__shiroaniSkipInterval);
        window.__shiroaniSkipInterval = null;
      }

      if (!SKIP_WINDOWS.length) return { ok: true, mode: 'no-windows' };

      ${COLLECT_VIDEOS_FN_SOURCE}

      // ── DOM ──────────────────────────────────────────────────────
      const wrap = document.createElement('div');
      wrap.setAttribute(SHIROANI_ATTR, 'root');
      wrap.style.cssText = [
        'all: initial',
        'position: fixed',
        'right: 24px',
        'bottom: 80px',
        'z-index: 2147483647',
        'font-family: system-ui, -apple-system, "Segoe UI", sans-serif',
        'pointer-events: auto',
        'display: none',
      ].join(';');

      const toast = document.createElement('div');
      toast.setAttribute(SHIROANI_ATTR, 'toast');
      toast.style.cssText = [
        'all: initial',
        'display: flex',
        'align-items: center',
        'gap: 10px',
        'padding: 10px 16px',
        'border-radius: 9px',
        'background: rgba(20, 14, 24, 0.9)',
        'color: white',
        'font-size: 13px',
        'font-weight: 600',
        'box-shadow: 0 6px 20px rgba(0,0,0,0.5)',
        'border: 1px solid rgba(255,255,255,0.15)',
        'cursor: pointer',
        'font-family: inherit',
        'white-space: nowrap',
        'user-select: none',
      ].join(';');

      const labelEl = document.createElement('span');
      labelEl.setAttribute(SHIROANI_ATTR, 'label');
      const countdownEl = document.createElement('span');
      countdownEl.setAttribute(SHIROANI_ATTR, 'countdown');
      countdownEl.style.cssText = 'all: initial; opacity: 0.7; font-size: 12px; font-family: inherit;';

      toast.appendChild(labelEl);
      toast.appendChild(countdownEl);
      wrap.appendChild(toast);
      (document.body || document.documentElement).appendChild(wrap);

      ${FULLSCREEN_REPARENT_SOURCE(ATTR)}

      // ── State ────────────────────────────────────────────────────
      let activeWindow = null;
      let seekedWindows = new Set();

      function getVideo() {
        const videos = shiroaniCollectVideos(document)
          .filter(v => (v.videoWidth | 0) > 0 && v.currentTime > 0);
        if (!videos.length) return null;
        videos.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight));
        return videos[0];
      }

      function showToast(win) {
        labelEl.textContent = '⏭ ' + win.label;
        wrap.style.display = 'block';
        activeWindow = win;
      }

      function hideToast() {
        wrap.style.display = 'none';
        activeWindow = null;
      }

      function seekTo(endTime) {
        const v = getVideo();
        if (v) v.currentTime = endTime;
        hideToast();
      }

      toast.addEventListener('click', () => {
        if (activeWindow) seekTo(activeWindow.endTime);
      });

      // ── Poll loop ────────────────────────────────────────────────
      window.__shiroaniSkipInterval = setInterval(() => {
        const v = getVideo();
        if (!v) return;
        const t = v.currentTime;

        let found = null;
        for (const win of SKIP_WINDOWS) {
          if (seekedWindows.has(win.startTime)) continue;
          const secsUntil = win.startTime - t;
          if (secsUntil <= PRE_SHOW_SECS && secsUntil > 0) {
            found = win;
            break;
          }
          // Inside window — auto-seek or keep showing toast
          if (t >= win.startTime && t < win.endTime) {
            if (AUTO_SKIP && !seekedWindows.has(win.startTime)) {
              seekedWindows.add(win.startTime);
              seekTo(win.endTime);
              return;
            }
            found = win;
            break;
          }
          // Past window — dismiss if it was active
          if (t >= win.endTime && activeWindow && activeWindow.startTime === win.startTime) {
            seekedWindows.add(win.startTime);
            hideToast();
          }
        }

        if (found) {
          if (!activeWindow || activeWindow.startTime !== found.startTime) {
            showToast(found);
          }
          const secsRemaining = Math.max(0, Math.ceil(found.startTime - t));
          countdownEl.textContent = secsRemaining > 0 ? '(' + secsRemaining + 's)' : '';
        } else if (activeWindow) {
          hideToast();
        }
      }, 500);

      return { ok: true, mode: 'toast', windows: SKIP_WINDOWS.length };
    })()
  `;
}
