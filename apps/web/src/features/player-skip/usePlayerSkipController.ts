/**
 * Renderer-side coordinator for the OP/ED skip controller.
 *
 * For one pane, this hook:
 *   1. Watches the pane's URL/title and the settings master toggle.
 *   2. Detects the anime/episode via `detectAnimeFromUrl` + `extractEpisodeNumber`.
 *   3. Asynchronously resolves the MAL id via the 3-tier `resolveMalId` chain.
 *      Tier-2 hits persist back to the library entry through `updateEntry`.
 *   4. Bridges the resolved values to the main-process controller via three
 *      IPC channels (attach / update / detach).
 *
 * Race-condition guard:
 *   Each effect run captures a monotonic `attachId` (per webContents). The
 *   async resolveMalId path checks the captured attachId before applying its
 *   result; if the user has already navigated away (or the master toggle
 *   flipped off), the result is dropped silently.
 *
 * The hook prefers `update` over `detach+attach` for in-place state changes
 * so listeners and frame cache survive across episode changes within the same
 * anime. A full detach happens only when the master toggle goes off, the
 * pane leaves a recognised player host, or the hook unmounts.
 */
import { useEffect, useRef } from 'react';
import { createLogger } from '@shiroani/shared';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { getWebview } from '@/components/browser/webviewRefs';
import { detectAnimeFromUrl } from '@/lib/anime-detection';
import { extractEpisodeNumber } from './episode-from-url';
import { resolveMalId } from './resolveMalId';

const logger = createLogger('PlayerSkipHook');

interface AttachedState {
  webContentsId: number;
  malId: number | null;
  episode: number | null;
  autoSkipEnabled: boolean;
}

/**
 * Resolve the webview's webContentsId, returning null when the webview is
 * mounted but not yet attached, or when the call throws (the webview can
 * raise during teardown).
 */
function safeGetWebContentsId(paneId: string): number | null {
  const webview = getWebview(paneId);
  if (!webview) return null;
  try {
    const id = webview.getWebContentsId();
    return typeof id === 'number' && id > 0 ? id : null;
  } catch (err) {
    logger.debug(
      `getWebContentsId(${paneId}) failed: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

function shallowEqualState(a: AttachedState | null, b: AttachedState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.webContentsId === b.webContentsId &&
    a.malId === b.malId &&
    a.episode === b.episode &&
    a.autoSkipEnabled === b.autoSkipEnabled
  );
}

export function usePlayerSkipController(paneId: string): void {
  // Subscribe to URL+title slice so the effect re-runs on navigation.
  const url = useBrowserStore(s => {
    const leaf = findLeafById(s.tabs, paneId);
    return leaf?.url ?? '';
  });
  const title = useBrowserStore(s => {
    const leaf = findLeafById(s.tabs, paneId);
    return leaf?.title ?? '';
  });

  const opEdSkipEnabled = useSettingsStore(s => s.opEdSkipEnabled);
  const autoSkipEnabled = useSettingsStore(s => s.autoSkipEnabled);

  // Monotonic counter — each effect run gets a fresh value; async work
  // checks `attachIdRef.current === captured` before applying its results.
  const attachIdRef = useRef(0);
  // The last state we sent to main. Used to choose attach vs update and to
  // detach on unmount.
  const attachedStateRef = useRef<AttachedState | null>(null);

  // Helper that diffs the prior attached state and emits attach/update IPC.
  // Defined before the effect that uses it so eslint's no-use-before-define
  // is satisfied. Captures `attachedStateRef` from the enclosing scope; safe
  // because refs are stable.
  const sendAttachOrUpdate = (
    api: NonNullable<typeof window.electronAPI>['playerSkip'],
    next: AttachedState
  ): void => {
    const previous = attachedStateRef.current;

    // Same webContents → can do an in-place update (no flicker).
    if (previous && previous.webContentsId === next.webContentsId) {
      if (shallowEqualState(previous, next)) return;
      attachedStateRef.current = next;
      void api
        .updateController({
          webContentsId: next.webContentsId,
          partial: {
            malId: next.malId,
            episode: next.episode,
            autoSkipEnabled: next.autoSkipEnabled,
          },
        })
        .catch(err =>
          logger.debug(
            `updateController failed: ${err instanceof Error ? err.message : String(err)}`
          )
        );
      return;
    }

    // Different webContents (or first attach) → detach prior, attach fresh.
    if (previous) {
      void api
        .detachController({ webContentsId: previous.webContentsId })
        .catch(err =>
          logger.debug(
            `detachController failed (switching wc): ${err instanceof Error ? err.message : String(err)}`
          )
        );
    }
    attachedStateRef.current = next;
    void api
      .attachController({
        webContentsId: next.webContentsId,
        malId: next.malId,
        episode: next.episode,
        autoSkipEnabled: next.autoSkipEnabled,
      })
      .catch(err =>
        logger.debug(`attachController failed: ${err instanceof Error ? err.message : String(err)}`)
      );
  };

  useEffect(() => {
    const api = window.electronAPI?.playerSkip;
    if (!api) return; // web build, no native bridge

    const myAttachId = ++attachIdRef.current;

    // ── Master toggle off → detach if attached, then bail. ───────────────
    if (!opEdSkipEnabled) {
      const last = attachedStateRef.current;
      if (last) {
        attachedStateRef.current = null;
        void api
          .detachController({ webContentsId: last.webContentsId })
          .catch(err =>
            logger.debug(
              `detachController failed (master toggle off): ${err instanceof Error ? err.message : String(err)}`
            )
          );
      }
      return;
    }

    // ── Detect anime + episode from URL/title. ──────────────────────────
    const detection = url ? detectAnimeFromUrl(url, title) : null;
    if (!detection) {
      const last = attachedStateRef.current;
      if (last) {
        attachedStateRef.current = null;
        void api
          .detachController({ webContentsId: last.webContentsId })
          .catch(err =>
            logger.debug(
              `detachController failed (no detection): ${err instanceof Error ? err.message : String(err)}`
            )
          );
      }
      return;
    }

    const episode = extractEpisodeNumber(url, title);
    const webContentsId = safeGetWebContentsId(paneId);
    if (webContentsId === null) {
      // Webview not ready yet — bail without changing attached state.
      // Effect re-runs on URL change; webview will be ready by then.
      return;
    }

    // ── Send a *provisional* attach immediately. ────────────────────────
    // The fallback button shows up in the iframe before resolveMalId resolves;
    // when the MAL id arrives the hook upgrades via `update`.
    sendAttachOrUpdate(api, {
      webContentsId,
      malId: null,
      episode,
      autoSkipEnabled,
    });

    // ── Async MAL id resolution. ────────────────────────────────────────
    const libraryEntries = useLibraryStore.getState().entries;
    const updateEntry = useLibraryStore.getState().updateEntry;

    void resolveMalId({
      animeTitle: detection.animeTitle,
      libraryEntries,
      onAnilistIdResolved: (entryId, anilistId) => {
        // Tier-2 persist — write the resolved anilistId back to the library
        // entry so the next navigation hits Tier-1 directly.
        try {
          updateEntry({ id: entryId, anilistId });
        } catch (err) {
          logger.warn(
            `updateEntry persist failed for entry=${entryId}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      },
    })
      .then(resolution => {
        // Stale-result guard.
        if (attachIdRef.current !== myAttachId) {
          logger.debug(
            `resolveMalId result for "${detection.animeTitle}" dropped — attachId stale`
          );
          return;
        }
        if (!resolution) {
          // Below threshold or fetch failed — keep the fallback.
          return;
        }
        // Re-resolve webContentsId in case the webview was remounted.
        const wcIdNow = safeGetWebContentsId(paneId);
        if (wcIdNow === null) return;
        sendAttachOrUpdate(api, {
          webContentsId: wcIdNow,
          malId: resolution.malId,
          episode,
          autoSkipEnabled,
        });
      })
      .catch(err => {
        logger.warn(
          `resolveMalId threw for "${detection.animeTitle}": ${err instanceof Error ? err.message : String(err)}`
        );
      });
  }, [paneId, url, title, opEdSkipEnabled, autoSkipEnabled]);

  // ── Detach on unmount. ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      const api = window.electronAPI?.playerSkip;
      const last = attachedStateRef.current;
      if (!api || !last) return;
      attachedStateRef.current = null;
      void api
        .detachController({ webContentsId: last.webContentsId })
        .catch(err =>
          logger.debug(
            `detachController failed (unmount): ${err instanceof Error ? err.message : String(err)}`
          )
        );
    };
  }, []);
}
