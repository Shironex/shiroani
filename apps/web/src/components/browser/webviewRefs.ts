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
  /**
   * Highlight matches of `text` in the guest page. Returns a request id; match
   * counts arrive asynchronously via the `found-in-page` event.
   */
  findInPage: (text: string, options?: { forward?: boolean; findNext?: boolean }) => number;
  /** Clear find highlights. `action` controls how the selection is left. */
  stopFindInPage: (action: 'clearSelection' | 'keepSelection' | 'activateSelection') => void;
};

/** Shape of the `found-in-page` event's `result` payload (Electron). */
export type FoundInPageResult = {
  requestId: number;
  activeMatchOrdinal: number;
  matches: number;
  finalUpdate: boolean;
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
