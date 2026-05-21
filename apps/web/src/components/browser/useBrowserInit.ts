import { useState, useEffect } from 'react';
import { useBrowserStore } from '@/stores/useBrowserStore';

/**
 * Handles browser tab restoration on mount.
 *
 * Reads persisted tabs from electron-store and populates the Zustand store.
 * If no tabs are restored, opens a default tab.
 */
export function useBrowserInit() {
  const { openTab, restoreTabs } = useBrowserStore.getState();
  const tabs = useBrowserStore(s => s.tabs);

  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    restoreTabs()
      .then(() => setInitialCheckDone(true))
      .catch(() => setInitialCheckDone(true));

    // Listen for window.open requests forwarded from main process via
    // did-attach-webview + setWindowOpenHandler (new-window event was
    // removed in Electron 22, so main process intercepts and forwards).
    const cleanupNewWindow = window.electronAPI?.browser?.onNewWindowRequest?.((url: string) => {
      useBrowserStore.getState().openTab(url);
    });

    return () => cleanupNewWindow?.();
  }, [restoreTabs]);

  // Open a default tab if none exist (after initial check completes)
  useEffect(() => {
    if (initialCheckDone && tabs.length === 0) {
      openTab();
    }
  }, [initialCheckDone, tabs.length, openTab]);
}
