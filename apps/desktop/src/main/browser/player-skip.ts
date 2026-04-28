import { webContents as electronWebContents, webFrameMain, type WebContents } from 'electron';
import { createMainLogger } from '../logging/logger';

const logger = createMainLogger('PlayerSkip');

/**
 * Snapshot of a single frame in a webContents tree, captured by the probe IPC.
 * Returned shape is JSON-serialisable so it survives the IPC boundary intact.
 */
export interface ProbeFrameInfo {
  url: string;
  origin: string;
  processId: number;
  routingId: number;
  detached: boolean;
  /** All `<video>` elements in this frame and their basic media state. */
  videos: ProbeVideoInfo[];
  /** Top-level error encountered when probing this frame, if any. */
  error?: string;
}

export interface ProbeVideoInfo {
  width: number;
  height: number;
  currentTime: number;
  duration: number;
  paused: boolean;
  src: string;
  /** Convenience flag: width > 0 && currentTime > 0 && !paused — the "real" video. */
  playing: boolean;
}

/**
 * Diagnostic result returned from `probeFrames` — the renderer renders this as a
 * dev panel so we can see exactly what frame tree the page produced and which
 * frames have a playing `<video>` element.
 */
export interface ProbeResult {
  webContentsId: number;
  topUrl: string;
  frames: ProbeFrameInfo[];
  /** Indexes into `frames` that contain a "playing" video. */
  playingFrameIndices: number[];
  startedAt: number;
  durationMs: number;
}

export interface SeekResult {
  ok: boolean;
  reason?: string;
  /** currentTime before seek (seconds). */
  before?: number;
  /** currentTime after seek (seconds). */
  after?: number;
  /** URL of the frame whose video was seeked. */
  frameUrl?: string;
  /** Frame ids in case caller wants to retain a handle. */
  frameProcessId?: number;
  frameRoutingId?: number;
}

/**
 * Shared helper injected into every executeJavaScript call. Walks the document
 * AND every shadow root recursively to collect `<video>` elements — modern
 * players (VK, JWPlayer, video.js, plyr, custom web components) commonly wrap
 * their `<video>` in a closed/open shadow root, which `document.querySelectorAll`
 * does NOT pierce. Without this, frames like vk.com/video_ext.php report vids=0
 * even when a video is clearly playing.
 *
 * Closed shadow roots remain inaccessible — but most player libs use open ones.
 */
const COLLECT_VIDEOS_FN_SOURCE = `
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
 * IIFE source that returns the basic state of every `<video>` element in the
 * frame's document AND its shadow roots. Serialised return value is shipped
 * back across the IPC boundary so any non-primitive properties are normalised
 * here.
 *
 * Filters that distinguish a "real" playing video from anti-adblock decoy
 * elements (see feasibility doc § Risks): videoWidth > 0 AND currentTime > 0
 * AND !paused.
 */
const PROBE_VIDEOS_SOURCE = `
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

/**
 * Resolve the WebContents instance for a given id. Returns null if the
 * webContents is gone or destroyed — never throws.
 */
function safeGetWebContents(webContentsId: number): WebContents | null {
  try {
    const wc = electronWebContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return null;
    return wc;
  } catch (err) {
    logger.warn(`safeGetWebContents(${webContentsId}) failed`, err);
    return null;
  }
}

/**
 * Re-resolve a WebFrameMain by (processId, routingId). Electron 33+ may invalidate
 * frame references mid-navigation; per the breaking-change note in
 * https://www.electronjs.org/docs/latest/breaking-changes#behavior-changed-frame-properties-may-retrieve-detached-webframemain-instances-or-none-at-all
 * we should always re-resolve via fromId and check `frame.detached` before
 * calling executeJavaScript on it. Returns null when the frame can't be reached
 * or is detached.
 */
function safeResolveFrame(processId: number, routingId: number): Electron.WebFrameMain | null {
  try {
    const frame = webFrameMain.fromId(processId, routingId);
    if (!frame) return null;
    if (frame.detached) {
      logger.debug(`safeResolveFrame: frame ${processId}/${routingId} is detached`);
      return null;
    }
    return frame;
  } catch (err) {
    logger.warn(`safeResolveFrame(${processId}/${routingId}) failed`, err);
    return null;
  }
}

/**
 * Walk every frame in the webContents tree and return a JSON snapshot of the
 * frame tree plus the `<video>` elements inside each frame.
 *
 * This is the diagnostic counterpart to `findPlayingVideoFrame` — instead of
 * returning the first playing frame, it returns *everything* so the user can
 * inspect what the page actually produced. Critical for the POC since real-world
 * streaming sites hide behind multiple nested cross-origin iframes.
 */
export async function probeFrames(webContentsId: number): Promise<ProbeResult> {
  const startedAt = Date.now();
  const wc = safeGetWebContents(webContentsId);
  if (!wc) {
    return {
      webContentsId,
      topUrl: '',
      frames: [],
      playingFrameIndices: [],
      startedAt,
      durationMs: Date.now() - startedAt,
    };
  }

  const topUrl = wc.getURL();
  // mainFrame.framesInSubtree includes the main frame and every descendant —
  // exactly what we want. Documented at:
  // https://www.electronjs.org/docs/latest/api/web-frame-main#frameframesinsubtree-readonly
  const allFrames = wc.mainFrame?.framesInSubtree ?? [];
  logger.info(`probeFrames(wc=${webContentsId}) topUrl=${topUrl} frameCount=${allFrames.length}`);

  const result: ProbeFrameInfo[] = [];
  for (const frame of allFrames) {
    const info: ProbeFrameInfo = {
      url: frame.url,
      origin: frame.origin,
      processId: frame.processId,
      routingId: frame.routingId,
      detached: frame.detached,
      videos: [],
    };

    if (frame.detached) {
      info.error = 'detached';
      result.push(info);
      continue;
    }

    // Re-resolve before calling executeJavaScript — guards against the
    // Electron 33+ stale-reference footgun (the frame from `framesInSubtree`
    // may have been swapped out by the time we get to it).
    const live = safeResolveFrame(frame.processId, frame.routingId);
    if (!live) {
      info.error = 'unreachable';
      result.push(info);
      continue;
    }

    try {
      const raw = (await live.executeJavaScript(PROBE_VIDEOS_SOURCE)) as ProbeVideoInfo[] | null;
      info.videos = Array.isArray(raw) ? raw : [];
      logger.debug(
        `  frame[${frame.processId}/${frame.routingId}] ${frame.url} videos=${info.videos.length}`
      );
    } catch (err) {
      info.error = err instanceof Error ? err.message : String(err);
      logger.debug(
        `  frame[${frame.processId}/${frame.routingId}] ${frame.url} probe failed: ${info.error}`
      );
    }

    result.push(info);
  }

  const playingFrameIndices: number[] = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i].videos.some(v => v.playing)) playingFrameIndices.push(i);
  }

  const out: ProbeResult = {
    webContentsId,
    topUrl,
    frames: result,
    playingFrameIndices,
    startedAt,
    durationMs: Date.now() - startedAt,
  };
  logger.info(
    `probeFrames(wc=${webContentsId}) done in ${out.durationMs}ms — ${playingFrameIndices.length}/${result.length} frames have a playing video`
  );
  return out;
}

/**
 * Walk the frame tree and return the first frame containing a "playing" video.
 *
 * "Playing" filter (anti-adblock decoy guard, per feasibility doc):
 *   videoWidth > 0 && currentTime > 0 && !paused
 *
 * Returns the (processId, routingId) handle so callers can re-resolve via
 * `webFrameMain.fromId` when they're ready to act, dodging the Electron 33+
 * detached-frame issue.
 */
export async function findPlayingVideoFrame(
  webContentsId: number
): Promise<{ processId: number; routingId: number; url: string } | null> {
  const wc = safeGetWebContents(webContentsId);
  if (!wc) return null;

  const allFrames = wc.mainFrame?.framesInSubtree ?? [];
  logger.debug(`findPlayingVideoFrame: scanning ${allFrames.length} frames in wc=${webContentsId}`);

  for (const frame of allFrames) {
    if (frame.detached) continue;
    const live = safeResolveFrame(frame.processId, frame.routingId);
    if (!live) continue;

    try {
      // Quick `boolean` query — cheaper than the full probe payload. Pierces
      // shadow DOM via shiroaniCollectVideos so VK / shadow-root players match.
      const hasPlaying = (await live.executeJavaScript(`
        (() => {
          ${COLLECT_VIDEOS_FN_SOURCE}
          const videos = shiroaniCollectVideos(document);
          return videos.some(v => (v.videoWidth | 0) > 0 && v.currentTime > 0 && !v.paused);
        })()
      `)) as boolean;
      if (hasPlaying) {
        logger.debug(
          `findPlayingVideoFrame: hit at [${frame.processId}/${frame.routingId}] ${frame.url}`
        );
        return { processId: frame.processId, routingId: frame.routingId, url: frame.url };
      }
    } catch (err) {
      logger.debug(
        `findPlayingVideoFrame: probe failed at [${frame.processId}/${frame.routingId}] ${frame.url}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return null;
}

/**
 * Seek the active playing `<video>` by `deltaSeconds`. Returns rich diagnostic
 * info: before/after times, the frame URL, and a structured `reason` when it
 * couldn't seek (no playing video, frame detached, etc.).
 *
 * The same playing-video filter from findPlayingVideoFrame is rebuilt inside
 * the IIFE so we don't seek a decoy element. Picks the largest playing video
 * if there are multiple (defensive against multi-video pages).
 */
export async function seekActiveVideo(
  webContentsId: number,
  deltaSeconds: number
): Promise<SeekResult> {
  const wc = safeGetWebContents(webContentsId);
  if (!wc) return { ok: false, reason: 'webContents-unreachable' };

  const found = await findPlayingVideoFrame(webContentsId);
  if (!found) return { ok: false, reason: 'no-playing-video' };

  // Re-resolve the frame fresh — the `executeJavaScript` in
  // findPlayingVideoFrame may have allowed time for navigation.
  const live = safeResolveFrame(found.processId, found.routingId);
  if (!live) return { ok: false, reason: 'frame-detached', frameUrl: found.url };

  // Build the seek script with the delta interpolated as a literal number so
  // there's no string-quoting ambiguity. Pick the largest playing video as the
  // target. JSON.stringify guards against any future non-finite delta values.
  const deltaLiteral = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
  const seekSource = `
    (() => {
      ${COLLECT_VIDEOS_FN_SOURCE}
      const videos = shiroaniCollectVideos(document)
        .filter(v => (v.videoWidth | 0) > 0 && v.currentTime > 0 && !v.paused);
      if (videos.length === 0) return { ok: false, reason: 'no-playing-video' };
      videos.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight));
      const target = videos[0];
      const before = target.currentTime;
      target.currentTime = before + (${JSON.stringify(deltaLiteral)});
      return {
        ok: true,
        before,
        after: target.currentTime,
        width: target.videoWidth,
        height: target.videoHeight,
        duration: target.duration,
      };
    })()
  `;

  try {
    const raw = (await live.executeJavaScript(seekSource)) as
      | { ok: true; before: number; after: number; width: number; height: number; duration: number }
      | { ok: false; reason: string }
      | null;
    if (!raw) {
      return { ok: false, reason: 'empty-result', frameUrl: found.url };
    }
    if (!raw.ok) {
      return {
        ok: false,
        reason: raw.reason,
        frameUrl: found.url,
        frameProcessId: found.processId,
        frameRoutingId: found.routingId,
      };
    }
    logger.info(
      `seekActiveVideo(wc=${webContentsId}, delta=${deltaSeconds}) ${raw.before.toFixed(2)}s → ${raw.after.toFixed(2)}s @ ${found.url}`
    );
    return {
      ok: true,
      before: raw.before,
      after: raw.after,
      frameUrl: found.url,
      frameProcessId: found.processId,
      frameRoutingId: found.routingId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      `seekActiveVideo(wc=${webContentsId}, delta=${deltaSeconds}) executeJavaScript failed: ${message}`
    );
    return { ok: false, reason: `executeJavaScript-failed: ${message}`, frameUrl: found.url };
  }
}

/**
 * Stretch goal — inject a "Skip +120s" button directly into the playing-video
 * frame's DOM. Purely diagnostic for the POC: we want to learn what styling
 * survives in the iframe context, whether MutationObservers strip it, and how
 * it behaves in fullscreen.
 *
 * Returns ok+frameUrl when the button was inserted (regardless of long-term
 * survival), or a structured error.
 */
export async function injectSkipButtonIntoFrame(
  webContentsId: number,
  deltaSeconds: number
): Promise<{ ok: boolean; reason?: string; frameUrl?: string }> {
  const found = await findPlayingVideoFrame(webContentsId);
  if (!found) return { ok: false, reason: 'no-playing-video' };

  const live = safeResolveFrame(found.processId, found.routingId);
  if (!live) return { ok: false, reason: 'frame-detached', frameUrl: found.url };

  const deltaLiteral = Number.isFinite(deltaSeconds) ? deltaSeconds : 0;
  // Standalone IIFE that drops a fixed-position button into the iframe DOM.
  // Idempotent: replaces any existing button with the same data attribute on
  // re-injection so spamming the button doesn't pile up duplicates.
  //
  // Fullscreen handling: HTML5 fullscreen only renders the fullscreen element
  // and its descendants — a button at <body> level becomes invisible. We watch
  // for `fullscreenchange` (+ vendor prefix) and reparent our wrap into the
  // current fullscreen element, then back to body when exiting. The listener
  // is bound once per iframe `window` (idempotent across re-injections) via a
  // sentinel flag so re-clicking the dock button doesn't pile up handlers.
  //
  // Position: `bottom: 96px` clears the typical 60-80px player control bar
  // (timeline + transport buttons) on VK / mp4upload / streamtape.
  const injectSource = `
    (() => {
      const SHIROANI_ATTR = 'data-shiroani-skip-poc';
      document.querySelectorAll('[' + SHIROANI_ATTR + ']').forEach(n => n.remove());

      const wrap = document.createElement('div');
      wrap.setAttribute(SHIROANI_ATTR, 'wrap');
      wrap.style.cssText = [
        'all: initial',
        'position: fixed',
        'right: 24px',
        'bottom: 96px',
        'z-index: 2147483647',
        'font-family: system-ui, -apple-system, "Segoe UI", sans-serif',
        'font-size: 13px',
        'pointer-events: auto',
      ].join(';');

      const btn = document.createElement('button');
      btn.setAttribute(SHIROANI_ATTR, 'btn');
      btn.textContent = '⏭ Pomiń +' + (${JSON.stringify(deltaLiteral)}) + 's';
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
          videos[0].currentTime = videos[0].currentTime + (${JSON.stringify(deltaLiteral)});
        }
      });

      wrap.appendChild(btn);
      (document.body || document.documentElement).appendChild(wrap);

      // Reparent into the fullscreen element so the button stays visible when
      // the user fullscreens the player. Reparent back to <body> on exit.
      const reparentForFullscreen = () => {
        const fs = document.fullscreenElement || document.webkitFullscreenElement;
        const wrapEl = document.querySelector('[' + SHIROANI_ATTR + '="wrap"]');
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
      // Run once on inject in case user clicked Wstrzyknij while already fullscreen.
      reparentForFullscreen();

      return {
        ok: true,
        host: location.host,
        hasBody: !!document.body,
        wasFullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
      };
    })()
  `;

  try {
    const raw = (await live.executeJavaScript(injectSource)) as {
      ok: true;
      host: string;
      hasBody: boolean;
      wasFullscreen: boolean;
    } | null;
    if (!raw) return { ok: false, reason: 'empty-result', frameUrl: found.url };
    logger.info(
      `injectSkipButtonIntoFrame(wc=${webContentsId}) injected into ${found.url} (host=${raw.host}, hasBody=${raw.hasBody})`
    );
    return { ok: true, frameUrl: found.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(
      `injectSkipButtonIntoFrame(wc=${webContentsId}) executeJavaScript failed: ${message}`
    );
    return { ok: false, reason: `executeJavaScript-failed: ${message}`, frameUrl: found.url };
  }
}
