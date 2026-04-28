import {
  webContents as electronWebContents,
  webFrameMain,
  type WebContents,
  type WebFrameMain,
} from 'electron';
import type { AniSkipClient, AniSkipResult } from '../../modules/aniskip';
import { createMainLogger } from '../logging/logger';
import { findPlayingVideoFrame } from './player-skip';
import { buildFallbackButtonScript, buildSkipToastScript } from './player-skip-injection';

const logger = createMainLogger('PlayerSkipController');

const FALLBACK_DELTA_SECONDS = 120;

/** Skip-toast labels passed into the injected script. Polish, user-facing. */
const SKIP_LABELS: Readonly<Record<AniSkipResult['skipType'], string>> = {
  op: 'Pomiń intro',
  ed: 'Pomiń outro',
  'mixed-op': 'Pomiń intro',
  'mixed-ed': 'Pomiń outro',
  recap: 'Pomiń streszczenie',
};

export type AttachMode = 'aniskip' | 'fallback' | 'none';

interface AttachState {
  webContentsId: number;
  malId: number | null;
  episode: number | null;
  autoSkipEnabled: boolean;
  /** Increments each time controller state changes — used to drop stale async results. */
  attachId: number;
  cachedFrame: { processId: number; routingId: number; lastSeenUrl: string } | null;
  /**
   * Whether the contextual toast is currently the active injection (vs. fallback).
   * Used so re-injections after `did-frame-finish-load` re-apply the right script.
   */
  lastMode: AttachMode;
  /** Cached AniSkip result so re-injection after navigation reuses the same windows. */
  lastSkipTimes: AniSkipResult[] | null;
  cleanupListeners: () => void;
}

/**
 * Per-webContents orchestrator for OP/ED skip injection.
 *
 * Design highlights:
 * - State is keyed by `webContentsId`. No globals; multi-tab safe.
 * - Frame cache stores `(processId, routingId)` only — never the {@link WebFrameMain}
 *   reference itself, since Electron 33+ may detach those mid-navigation.
 *   Re-resolved via {@link webFrameMain.fromId} on every executeJavaScript.
 * - Race-condition guard: every state-modifying call increments `attachId`. Async
 *   AniSkip fetches capture the attachId at start; if it changed by the time the
 *   fetch resolves, the result is dropped silently.
 * - Idempotency: injection scripts use `data-shiroani-skip*` sentinel attributes
 *   that replace prior injections rather than stack.
 * - Race against frame attach: as soon as `did-frame-finish-load` fires, the
 *   fallback button is injected immediately so the user sees *something*. The
 *   AniSkip fetch later upgrades it to the contextual toast.
 */
export class PlayerSkipController {
  private aniSkipClient: AniSkipClient | null = null;
  private readonly states = new Map<number, AttachState>();

  /**
   * Inject the AniSkip dependency. Called once after the Nest container is
   * created, since the controller is owned by the main process and has no
   * Nest scope of its own.
   */
  setAniSkipClient(client: AniSkipClient | null): void {
    this.aniSkipClient = client;
    logger.info(`AniSkipClient ${client ? 'attached' : 'detached'}`);
  }

  /**
   * Register the controller for a webContents. Replaces any prior registration
   * for the same id (incrementing attachId so prior in-flight fetches drop
   * their results).
   *
   * @returns The mode the initial injection landed in.
   */
  async attach(params: {
    webContentsId: number;
    malId: number | null;
    episode: number | null;
    autoSkipEnabled: boolean;
  }): Promise<AttachMode> {
    const { webContentsId, malId, episode, autoSkipEnabled } = params;
    const wc = safeGetWebContents(webContentsId);
    if (!wc) {
      logger.warn(`attach(${webContentsId}): webContents unreachable`);
      return 'none';
    }

    // If already attached, replace state in place. Bumping the attachId
    // invalidates any AniSkip fetch that's still in flight.
    const existing = this.states.get(webContentsId);
    if (existing) {
      existing.cleanupListeners();
    }

    const state: AttachState = {
      webContentsId,
      malId,
      episode,
      autoSkipEnabled,
      attachId: (existing?.attachId ?? 0) + 1,
      cachedFrame: null,
      lastMode: 'none',
      lastSkipTimes: null,
      cleanupListeners: () => {
        // populated below once listeners are attached
      },
    };

    // ── Wire webContents-level listeners ───────────────────────────
    const onDidFrameFinishLoad = (_event: Electron.Event, isMainFrame: boolean) => {
      // Inject on every frame load — the playing-video frame may be a
      // grandchild iframe whose finish-load fires after the main frame's.
      // Don't filter on isMainFrame here.
      void this.fetchAndInject(webContentsId);
      void isMainFrame;
    };

    const onDidNavigate = () => {
      // Top-level navigation invalidates the frame cache (the page tree is gone).
      const s = this.states.get(webContentsId);
      if (s) s.cachedFrame = null;
    };

    const onDidNavigateInPage = (_event: Electron.Event, _url: string, isMainFrame: boolean) => {
      if (!isMainFrame) return;
      // SPA-style navigation inside the page — frame tree may have shifted.
      const s = this.states.get(webContentsId);
      if (s) s.cachedFrame = null;
    };

    const onDidFrameNavigate = (
      _event: Electron.Event,
      _url: string,
      _httpResponseCode: number,
      _httpStatusText: string,
      isMainFrame: boolean,
      frameProcessId: number,
      frameRoutingId: number
    ) => {
      if (isMainFrame) return;
      // Subframe navigated — if it's the cached frame, drop the cache so the
      // next inject re-walks the tree.
      const s = this.states.get(webContentsId);
      if (
        s?.cachedFrame &&
        s.cachedFrame.processId === frameProcessId &&
        s.cachedFrame.routingId === frameRoutingId
      ) {
        s.cachedFrame = null;
      }
    };

    const onMediaStartedPlaying = () => {
      // Two cases to handle here:
      //   1. The user just pressed play on the initial player iframe — the
      //      attach-time fetchAndInject no-op'd because the filter requires
      //      `videoWidth > 0 && currentTime > 0 && !paused`.
      //   2. The user switched players (Zmień player on ogladajanime) — the
      //      cached frame might still be reachable (old iframe lingering in
      //      the DOM) but is no longer the playing frame. We must re-walk.
      // Invalidate the frame cache before re-running inject so case 2 doesn't
      // re-inject into the stale frame.
      const s = this.states.get(webContentsId);
      if (s) s.cachedFrame = null;
      logger.info(`media-started-playing(wc=${webContentsId}) — re-running inject`);
      void this.fetchAndInject(webContentsId);
    };

    const onDestroyed = () => {
      this.detach(webContentsId);
    };

    wc.on('did-frame-finish-load', onDidFrameFinishLoad);
    wc.on('did-navigate', onDidNavigate);
    wc.on('did-navigate-in-page', onDidNavigateInPage);
    wc.on('did-frame-navigate', onDidFrameNavigate);
    wc.on('media-started-playing', onMediaStartedPlaying);
    wc.on('destroyed', onDestroyed);

    state.cleanupListeners = () => {
      try {
        wc.off('did-frame-finish-load', onDidFrameFinishLoad);
        wc.off('did-navigate', onDidNavigate);
        wc.off('did-navigate-in-page', onDidNavigateInPage);
        wc.off('did-frame-navigate', onDidFrameNavigate);
        wc.off('media-started-playing', onMediaStartedPlaying);
        wc.off('destroyed', onDestroyed);
      } catch (err) {
        logger.debug(
          `cleanupListeners(${webContentsId}) — webContents already gone: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    };

    this.states.set(webContentsId, state);
    logger.info(
      `attach(wc=${webContentsId}) malId=${malId ?? 'null'} episode=${episode ?? 'null'} autoSkip=${autoSkipEnabled}`
    );

    // Fire initial injection. Don't await — the caller doesn't need to block.
    return this.fetchAndInject(webContentsId);
  }

  /**
   * Update a subset of the controller state without tearing down listeners.
   * Bumps attachId so any in-flight AniSkip fetch drops its result.
   */
  async update(
    webContentsId: number,
    partial: { malId?: number | null; episode?: number | null; autoSkipEnabled?: boolean }
  ): Promise<AttachMode> {
    const state = this.states.get(webContentsId);
    if (!state) {
      logger.debug(`update(${webContentsId}): no state — falling through to attach`);
      return 'none';
    }

    if (partial.malId !== undefined) state.malId = partial.malId;
    if (partial.episode !== undefined) state.episode = partial.episode;
    if (partial.autoSkipEnabled !== undefined) state.autoSkipEnabled = partial.autoSkipEnabled;
    state.attachId += 1;
    // Episode change invalidates the cached AniSkip data.
    state.lastSkipTimes = null;

    logger.info(
      `update(wc=${webContentsId}) malId=${state.malId ?? 'null'} episode=${state.episode ?? 'null'} autoSkip=${state.autoSkipEnabled}`
    );

    return this.fetchAndInject(webContentsId);
  }

  /**
   * Detach the controller from a webContents. Removes listeners, drops state,
   * but does not unwind any DOM injection — those are scoped to the page and
   * disappear on the next navigation/reload anyway.
   */
  detach(webContentsId: number): void {
    const state = this.states.get(webContentsId);
    if (!state) return;
    state.cleanupListeners();
    this.states.delete(webContentsId);
    logger.info(`detach(wc=${webContentsId})`);
  }

  /**
   * For tests/cleanup — drop every controller and its listeners.
   */
  detachAll(): void {
    for (const id of Array.from(this.states.keys())) {
      this.detach(id);
    }
  }

  /**
   * Resolve the playing-video frame for a webContents, using the per-state
   * cache when possible. Returns null when nothing is playing.
   */
  private async findAndCacheVideoFrame(
    state: AttachState
  ): Promise<{ processId: number; routingId: number; url: string } | null> {
    if (state.cachedFrame) {
      // Re-resolve to validate the cached handle is still alive.
      const frame = safeResolveFrame(state.cachedFrame.processId, state.cachedFrame.routingId);
      if (frame) {
        return {
          processId: state.cachedFrame.processId,
          routingId: state.cachedFrame.routingId,
          url: state.cachedFrame.lastSeenUrl,
        };
      }
      // Cached handle is stale — clear and re-walk.
      state.cachedFrame = null;
    }

    const found = await findPlayingVideoFrame(state.webContentsId);
    if (!found) return null;

    state.cachedFrame = {
      processId: found.processId,
      routingId: found.routingId,
      lastSeenUrl: found.url,
    };
    return found;
  }

  /**
   * Inject the appropriate script into the playing-video frame.
   *
   * Flow:
   * 1. Locate the playing-video frame (cached). If none, no-op.
   * 2. Inject the fallback button immediately so the user sees *something*.
   * 3. If we have malId+episode, kick off an AniSkip fetch. When it resolves
   *    (and the attachId still matches), upgrade to the contextual toast.
   *
   * @returns Initial mode the function landed in. The contextual upgrade
   *   happens asynchronously after this returns.
   */
  private async fetchAndInject(webContentsId: number): Promise<AttachMode> {
    const state = this.states.get(webContentsId);
    if (!state) return 'none';

    const startAttachId = state.attachId;

    const frameInfo = await this.findAndCacheVideoFrame(state);
    if (!frameInfo) {
      logger.debug(`fetchAndInject(wc=${webContentsId}): no playing video — skipping`);
      return 'none';
    }

    // Stale-result guard: state may have changed while we walked the tree.
    if (state.attachId !== startAttachId) {
      logger.debug(`fetchAndInject(wc=${webContentsId}): attachId changed — dropping`);
      return 'none';
    }

    // ── Reuse cached AniSkip windows for re-injection within the same episode ──
    if (state.lastMode === 'aniskip' && state.lastSkipTimes && state.lastSkipTimes.length > 0) {
      await this.injectToast(state, frameInfo, state.lastSkipTimes);
      return 'aniskip';
    }

    // ── Inject fallback button immediately ──
    await this.injectFallback(state, frameInfo);

    // ── No identifying data → fallback is the final state ──
    if (state.malId === null || state.episode === null) {
      return 'fallback';
    }

    // ── Try AniSkip (background; may upgrade to toast) ──
    if (!this.aniSkipClient) {
      logger.warn(
        `fetchAndInject(wc=${webContentsId}): AniSkipClient not initialised — staying on fallback`
      );
      return 'fallback';
    }

    const malId = state.malId;
    const episode = state.episode;

    // Fire-and-forget — caller already has the fallback applied.
    this.aniSkipClient
      .getSkipTimes(malId, episode, 0)
      .then(async results => {
        const current = this.states.get(webContentsId);
        if (!current || current.attachId !== startAttachId) {
          logger.debug(
            `AniSkip resolve(wc=${webContentsId}): attachId stale (${startAttachId} vs ${current?.attachId ?? 'gone'}) — dropping`
          );
          return;
        }
        if (results.length === 0) {
          logger.info(
            `AniSkip resolve(wc=${webContentsId}): no windows for malId=${malId} ep=${episode} — staying on fallback`
          );
          return;
        }
        logger.info(
          `AniSkip resolve(wc=${webContentsId}): malId=${malId} ep=${episode} → ${results.length} windows ${results.map(r => `${r.skipType}(${r.interval.startTime.toFixed(0)}-${r.interval.endTime.toFixed(0)}s)`).join(', ')}`
        );

        const liveFrame = await this.findAndCacheVideoFrame(current);
        if (!liveFrame) {
          logger.debug(
            `AniSkip resolve(wc=${webContentsId}): playing frame gone — dropping toast upgrade`
          );
          return;
        }

        // Re-check attachId after the second async hop.
        if (current.attachId !== startAttachId) return;

        current.lastSkipTimes = results;
        await this.injectToast(current, liveFrame, results);
      })
      .catch(err => {
        logger.warn(
          `AniSkip fetch failed(wc=${webContentsId}, malId=${malId}, ep=${episode}): ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return 'fallback';
  }

  /**
   * Inject the persistent fallback button. Idempotent — replaces any prior
   * injection via the sentinel attribute.
   */
  private async injectFallback(
    state: AttachState,
    frameInfo: { processId: number; routingId: number; url: string }
  ): Promise<void> {
    const frame = safeResolveFrame(frameInfo.processId, frameInfo.routingId);
    if (!frame) {
      logger.debug(
        `injectFallback(wc=${state.webContentsId}): frame ${frameInfo.processId}/${frameInfo.routingId} unreachable`
      );
      return;
    }
    const script = buildFallbackButtonScript(FALLBACK_DELTA_SECONDS);
    try {
      await frame.executeJavaScript(script);
      state.lastMode = 'fallback';
      logger.info(`injectFallback(wc=${state.webContentsId}) → ${frameInfo.url}`);
    } catch (err) {
      logger.warn(
        `injectFallback(wc=${state.webContentsId}): executeJavaScript failed — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Inject the contextual skip toast. Idempotent — replaces any prior toast
   * (and its setInterval) via the sentinel attribute and the
   * `__shiroaniSkipInterval` window guard.
   */
  private async injectToast(
    state: AttachState,
    frameInfo: { processId: number; routingId: number; url: string },
    results: AniSkipResult[]
  ): Promise<void> {
    const frame = safeResolveFrame(frameInfo.processId, frameInfo.routingId);
    if (!frame) {
      logger.debug(
        `injectToast(wc=${state.webContentsId}): frame ${frameInfo.processId}/${frameInfo.routingId} unreachable`
      );
      return;
    }

    const skipWindows = results.map(r => ({
      startTime: r.interval.startTime,
      endTime: r.interval.endTime,
      label: SKIP_LABELS[r.skipType] ?? 'Pomiń',
    }));

    const script = buildSkipToastScript({
      skipWindows,
      autoSkipEnabled: state.autoSkipEnabled,
    });
    try {
      await frame.executeJavaScript(script);
      state.lastMode = 'aniskip';
      logger.info(
        `injectToast(wc=${state.webContentsId}) → ${frameInfo.url} windows=${skipWindows.length}`
      );
    } catch (err) {
      logger.warn(
        `injectToast(wc=${state.webContentsId}): executeJavaScript failed — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

/**
 * Resolve the WebContents instance for a given id. Returns null when gone.
 */
function safeGetWebContents(webContentsId: number): WebContents | null {
  try {
    const wc = electronWebContents.fromId(webContentsId);
    if (!wc || wc.isDestroyed()) return null;
    return wc;
  } catch {
    return null;
  }
}

/**
 * Re-resolve a WebFrameMain by (processId, routingId). Mirrors the helper in
 * `player-skip.ts` — duplicated rather than exported because callers should be
 * conscious that they are re-resolving on every use.
 */
function safeResolveFrame(processId: number, routingId: number): WebFrameMain | null {
  try {
    const frame = webFrameMain.fromId(processId, routingId);
    if (!frame) return null;
    if (frame.detached) return null;
    return frame;
  } catch {
    return null;
  }
}

/** Singleton — bound from main/index.ts after Nest boot. */
export const playerSkipController = new PlayerSkipController();
