/**
 * Shared registry of webview element references by pane ID.
 *
 * A pane id is the leaf id of a BrowserNode in `useBrowserStore.tabs`. For
 * non-split tabs the pane id equals the tab id; for split tabs each child
 * leaf has its own id.
 *
 * Consumers:
 * - BrowserWebview: registers/unregisters on mount/unmount
 * - useBrowserStore actions: calls loadURL(), goBack(), goForward(), reload()
 * - AddToLibraryDialog: calls executeJavaScript() for metadata scraping
 */

// Electron's webview element type — extends HTMLElement with navigation methods
export type WebviewElement = HTMLElement & {
  loadURL: (url: string) => Promise<void>;
  getURL: () => string;
  getTitle: () => string;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stop: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  executeJavaScript: (code: string) => Promise<unknown>;
  setAudioMuted: (muted: boolean) => void;
  isAudioMuted: () => boolean;
  openDevTools: () => void;
  /** WebContents id of the guest page — used by main-process IPC to target this tab. */
  getWebContentsId: () => number;
};

const webviewRefs = new Map<string, WebviewElement>();

export function registerWebview(paneId: string, el: WebviewElement): void {
  webviewRefs.set(paneId, el);
}

export function unregisterWebview(paneId: string): void {
  webviewRefs.delete(paneId);
}

export function getWebview(paneId: string): WebviewElement | undefined {
  return webviewRefs.get(paneId);
}
