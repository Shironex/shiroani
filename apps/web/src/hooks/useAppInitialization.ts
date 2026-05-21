import { useEffect, useState, useCallback } from 'react';
import { createLogger, setLoggerContext, makeCorrelationId } from '@shiroani/shared';
import { installRendererLogBridge } from '@/lib/logger-bridge';
import { initializeSocket, connectSocket } from '@/lib/socket';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useNewTabStore } from '@/stores/useNewTabStore';

const logger = createLogger('AppInit');

/**
 * Initialize the app: fetch backend port, initialize socket, register store listeners, connect.
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
  const initConnectionListeners = useConnectionStore(s => s.initListeners);
  const cleanupConnectionListeners = useConnectionStore(s => s.cleanupListeners);
  const initUpdateListeners = useUpdateStore(s => s.initListeners);

  const initAllListeners = useCallback(() => {
    initConnectionListeners();
    initScheduleListeners();
    initLibraryListeners();
    initFeedListeners();
  }, [initConnectionListeners, initScheduleListeners, initLibraryListeners, initFeedListeners]);

  const cleanupAllListeners = useCallback(() => {
    cleanupConnectionListeners();
    cleanupScheduleListeners();
    cleanupLibraryListeners();
    cleanupFeedListeners();
  }, [
    cleanupConnectionListeners,
    cleanupScheduleListeners,
    cleanupLibraryListeners,
    cleanupFeedListeners,
  ]);

  useEffect(() => {
    let mounted = true;
    let cleanupUpdate: (() => void) | undefined;

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

        // Fetch backend port via IPC
        const port = await window.electronAPI?.app?.getBackendPort?.();
        if (port === undefined || port === null) {
          throw new Error('Failed to get backend port — electronAPI not available');
        }
        if (port <= 0 || port > 65535) {
          throw new Error(`Invalid backend port: ${port}`);
        }

        // Initialize socket with the backend port
        initializeSocket(port);

        // Register all socket listeners BEFORE connecting so that onConnect
        // callbacks fire on the initial connection
        initAllListeners();
        logger.info('All listeners registered');

        // Connect to the backend
        await connectSocket();
        if (!mounted) return;
        logger.info('Socket connected');

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
      uninstallLogBridge();
    };
  }, [initAllListeners, cleanupAllListeners, initUpdateListeners]);

  return { ready, error };
}
