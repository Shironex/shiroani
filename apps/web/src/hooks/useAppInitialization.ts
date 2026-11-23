import { useEffect, useState, useCallback } from 'react';
import { BackendEvents, createLogger, setLoggerContext, makeCorrelationId } from '@shiroani/shared';
import { installRendererLogBridge } from '@/lib/logger-bridge';
import { onBackendEvent } from '@/lib/backend';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useNewTabStore } from '@/stores/useNewTabStore';

const logger = createLogger('AppInit');

/**
 * Initialize the app: register store listeners, then start the first data load.
 * Returns `ready` boolean — views should not render until ready.
 */
export function useAppInitialization(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initScheduleListeners = useScheduleStore(s => s.initListeners);
  const cleanupScheduleListeners = useScheduleStore(s => s.cleanupListeners);
  const initLibraryListeners = useLibraryStore(s => s.initListeners);
  const cleanupLibraryListeners = useLibraryStore(s => s.cleanupListeners);
  const initFeedListeners = useFeedStore(s => s.initListeners);
  const cleanupFeedListeners = useFeedStore(s => s.cleanupListeners);
  const initUpdateListeners = useUpdateStore(s => s.initListeners);

  const initAllListeners = useCallback(() => {
    initScheduleListeners();
    initLibraryListeners();
    initFeedListeners();
  }, [initScheduleListeners, initLibraryListeners, initFeedListeners]);

  const cleanupAllListeners = useCallback(() => {
    cleanupScheduleListeners();
    cleanupLibraryListeners();
    cleanupFeedListeners();
  }, [cleanupScheduleListeners, cleanupLibraryListeners, cleanupFeedListeners]);

  useEffect(() => {
    let mounted = true;
    let cleanupUpdate: (() => void) | undefined;
    let cleanupResumed: (() => void) | undefined;

    // Wire the renderer ring buffer to main-process file logging before any
    // other init step logs so early initialization telemetry makes it to disk.
    const uninstallLogBridge = installRendererLogBridge();

    // Seed renderer session context immediately with what we can read
    // synchronously. The richer appVersion arrives async via getSystemInfo
    // below — early logs emitted in this tick won't carry it, which is fine.
    const rendererPlatform =
      typeof navigator !== 'undefined' && typeof navigator.platform === 'string'
        ? navigator.platform
        : undefined;
    setLoggerContext({
      sessionId: makeCorrelationId(),
      platform: rendererPlatform,
    });

    // Resolve appVersion (and platform from main, which is more accurate)
    // off the critical path. Failures are non-fatal — the field stays undefined.
    void window.electronAPI?.app
      ?.getSystemInfo?.()
      .then(info => {
        if (!info) return;
        setLoggerContext({
          appVersion: info.appVersion,
          platform: info.osPlatform ?? rendererPlatform,
        });
      })
      .catch(() => {
        // ignore — diagnostics will fall back to navigator.platform / 'unknown'.
      });

    const init = async () => {
      try {
        logger.info('Initializing app...');

        if (!window.electronAPI?.backend) {
          throw new Error('Failed to reach the backend: electronAPI not available');
        }

        // Nothing is awaited before this point any more, so StrictMode's first
        // effect would otherwise load everything before its cleanup runs. Yield once
        // and let that cleanup mark this run as dead.
        await Promise.resolve();
        if (!mounted) return;

        initAllListeners();
        logger.info('All listeners registered');

        // Not awaited: a slow AniList must not hold up the window.
        useLibraryStore.getState().loadInitialData();
        useScheduleStore.getState().loadInitialData();
        useFeedStore.getState().loadInitialData();

        cleanupResumed = onBackendEvent(BackendEvents.RESUMED, () => {
          useScheduleStore.getState().loadInitialData();
          useFeedStore.getState().loadInitialData();
        });

        // Init updater listeners (IPC-based)
        cleanupUpdate = initUpdateListeners();

        // Load quick access data
        try {
          await useQuickAccessStore.getState().loadSites();
        } catch {
          // Non-critical — quick access will use defaults
        }

        // Restore new tab page customization (panel order, visibility, counts)
        try {
          await useNewTabStore.getState().initNewTab();
        } catch {
          // Non-critical — new tab page will use defaults
        }

        setReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('Failed to initialize:', msg);
        if (mounted) setError(msg);
      }
    };

    init();

    return () => {
      mounted = false;
      cleanupAllListeners();
      cleanupUpdate?.();
      cleanupResumed?.();
      uninstallLogBridge();
    };
  }, [initAllListeners, cleanupAllListeners, initUpdateListeners]);

  return { ready, error };
}
