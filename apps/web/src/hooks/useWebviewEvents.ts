import { useEffect, type RefObject } from 'react';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import {
  registerWebview,
  unregisterWebview,
  type WebviewElement,
} from '@/components/browser/webviewRefs';
import { updateAnimePresence } from '@/lib/anime-detection';

interface WebviewNavigateEvent extends Event {
  url: string;
}
interface WebviewTitleEvent extends Event {
  title: string;
  explicitSet: boolean;
}
interface WebviewFaviconEvent extends Event {
  favicons: string[];
}
interface WebviewNavigateInPageEvent extends Event {
  url: string;
  isMainFrame: boolean;
}
interface WebviewFailLoadEvent extends Event {
  errorCode: number;
}

// Script injected on dom-ready to patch iframe allow attributes for video player compatibility.
// The MutationObserver self-disconnects after 30 s of no new iframe additions so it does not
// run forever in long-lived guest pages.
const IFRAME_PATCH_SCRIPT = `
(function() {
  var ALLOW_ATTR = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  var SETTLE_MS = 30000;
  function patchIframe(iframe) {
    if (!iframe.hasAttribute('allow') || !iframe.getAttribute('allow').includes('autoplay')) {
      iframe.setAttribute('allow', ALLOW_ATTR);
    }
  }
  document.querySelectorAll('iframe').forEach(patchIframe);
  var observer = new MutationObserver(function(mutations) {
    var patched = false;
    for (var m of mutations) {
      for (var node of m.addedNodes) {
        if (node.nodeName === 'IFRAME') { patchIframe(node); patched = true; }
        else if (node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(function(el) { patchIframe(el); patched = true; });
        }
      }
    }
    if (patched) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function() { observer.disconnect(); }, SETTLE_MS);
    }
  });
  var settleTimer = setTimeout(function() { observer.disconnect(); }, SETTLE_MS);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
`;

/**
 * Wires the per-leaf <webview> events into the store. The argument is a
 * leaf id (which equals the tab id for non-split tabs); it identifies which
 * leaf in the BrowserNode tree this webview belongs to.
 */
export function useWebviewEvents(webviewRef: RefObject<WebviewElement | null>, paneId: string) {
  useEffect(() => {
    const el = webviewRef.current;
    if (!el) return;

    const { updateTabState } = useBrowserStore.getState();

    // Register immediately so other code can access the webview ref before dom-ready
    registerWebview(paneId, el);

    const onDomReady = () => {
      el.executeJavaScript(IFRAME_PATCH_SCRIPT).catch(() => {});
    };

    const onDidNavigate = (e: Event) => {
      const detail = e as WebviewNavigateEvent;
      updateTabState(paneId, {
        url: detail.url,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      updateAnimePresence(paneId, useAppStore.getState().activeView);
    };

    const onDidNavigateInPage = (e: Event) => {
      const detail = e as WebviewNavigateInPageEvent;
      if (detail.isMainFrame === false) return;
      updateTabState(paneId, {
        url: detail.url,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });
      updateAnimePresence(paneId, useAppStore.getState().activeView);
    };

    const onPageTitleUpdated = (e: Event) => {
      const detail = e as WebviewTitleEvent;
      updateTabState(paneId, { title: detail.title });
      updateAnimePresence(paneId, useAppStore.getState().activeView);
    };

    const onPageFaviconUpdated = (e: Event) => {
      const detail = e as WebviewFaviconEvent;
      if (detail.favicons?.length > 0) {
        updateTabState(paneId, { favicon: detail.favicons[0] });
      }
    };

    const onDidStartLoading = () => {
      updateTabState(paneId, { isLoading: true });
    };

    const onDidStopLoading = () => {
      updateTabState(paneId, {
        isLoading: false,
        canGoBack: el.canGoBack(),
        canGoForward: el.canGoForward(),
      });

      // Track visit for frequent sites
      try {
        const currentUrl = el.getURL();
        const currentTitle = el.getTitle();
        const leaf = findLeafById(useBrowserStore.getState().tabs, paneId);
        useQuickAccessStore.getState().recordVisit(currentUrl, currentTitle, leaf?.favicon);
        // Chronological history (distinct from the aggregated frequent-sites list).
        useBrowserStore.getState().recordHistory(currentUrl, currentTitle, leaf?.favicon);
      } catch {
        // Non-critical — skip tracking
      }
    };

    const onDidFailLoad = (e: Event) => {
      const detail = e as WebviewFailLoadEvent;
      if (detail.errorCode === -3) return; // Aborted (harmless redirect)
      updateTabState(paneId, { isLoading: false });
    };

    const onEnterFullscreen = () => {
      useBrowserStore.setState({ isFullScreen: true });
      window.electronAPI?.browser?.setFullscreen?.(true);
    };

    const onLeaveFullscreen = () => {
      useBrowserStore.setState({ isFullScreen: false });
      window.electronAPI?.browser?.setFullscreen?.(false);
    };

    // Attach listeners
    el.addEventListener('dom-ready', onDomReady);
    el.addEventListener('did-navigate', onDidNavigate);
    el.addEventListener('did-navigate-in-page', onDidNavigateInPage);
    el.addEventListener('page-title-updated', onPageTitleUpdated);
    el.addEventListener('page-favicon-updated', onPageFaviconUpdated);
    el.addEventListener('did-start-loading', onDidStartLoading);
    el.addEventListener('did-stop-loading', onDidStopLoading);
    el.addEventListener('did-fail-load', onDidFailLoad);
    el.addEventListener('enter-html-full-screen', onEnterFullscreen);
    el.addEventListener('leave-html-full-screen', onLeaveFullscreen);

    // Cleanup
    return () => {
      unregisterWebview(paneId);
      el.removeEventListener('dom-ready', onDomReady);
      el.removeEventListener('did-navigate', onDidNavigate);
      el.removeEventListener('did-navigate-in-page', onDidNavigateInPage);
      el.removeEventListener('page-title-updated', onPageTitleUpdated);
      el.removeEventListener('page-favicon-updated', onPageFaviconUpdated);
      el.removeEventListener('did-start-loading', onDidStartLoading);
      el.removeEventListener('did-stop-loading', onDidStopLoading);
      el.removeEventListener('did-fail-load', onDidFailLoad);
      el.removeEventListener('enter-html-full-screen', onEnterFullscreen);
      el.removeEventListener('leave-html-full-screen', onLeaveFullscreen);
    };
  }, [paneId]);
}
