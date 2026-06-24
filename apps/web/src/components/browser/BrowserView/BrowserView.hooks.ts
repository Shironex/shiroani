import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { isNewTabUrl, NEW_TAB_URL, type BrowserLeafNode, type BrowserNode } from '@shiroani/shared';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { collectLeaves } from '@/stores/browser/browserTree';
import { useBrowserInit } from '@/components/browser/useBrowserInit';
import { unregisterWebview } from '@/components/browser/webviewRefs';
import { isEditableTarget } from '@/lib/is-editable-target';
import type { IBrowserViewView } from './BrowserView.types';

// Actions are stable references — extract once outside render cycle
const {
  openTab,
  closeTab,
  switchTab,
  reorderTabs,
  navigate,
  goBack,
  goForward,
  reload,
  splitTabs,
  unsplitTab,
  closeFocusedPane,
} = useBrowserStore.getState();

export { unsplitTab };

/** Measurement-only DOM marker attribute for a pane's slot. */
export const PANE_SLOT_ATTR = 'data-pane-slot';

/**
 * Slot key for a top-level tab — the id of its leftmost leaf. Stable across
 * split/unsplit transitions: when leaves A and B merge into a split, the
 * combined slot keeps the left leaf's id (matching the old A wrapper); when
 * a split unsplits, the survivor wrapper still carries the leftmost leaf's
 * id so React's reconciler reuses it. Webview lifetime is owned by the
 * portal layer below, but a stable wrapper key avoids unmounting the slot
 * subtree (and the layout-effect work that re-runs on every churn).
 */
export function slotKeyForTab(node: BrowserNode): string {
  return node.kind === 'leaf' ? node.id : slotKeyForTab(node.left);
}

export function useBrowserView(): IBrowserViewView {
  const { t } = useTranslation('browser');
  // Granular selectors: only re-render when these specific slices change
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activeTabId = useBrowserStore(s => s.activeTabId);
  const activePaneId = useBrowserStore(s => s.activePaneId);
  const splitTabsEnabled = useBrowserStore(s => s.splitTabsEnabled);
  const isAddressBarFocused = useBrowserStore(s => s.isAddressBarFocused);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);
  const favorites = useBrowserStore(useShallow(s => s.favorites));

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFindOpen, setIsFindOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const activePane = activePaneId ? findLeafById(tabs, activePaneId) : null;

  // Tab restoration on mount
  useBrowserInit();

  // Ref to focus address bar via Ctrl+L shortcut
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Shared shortcut handler used by both local keydown and IPC-forwarded events.
  // When the webview has focus, key events don't reach the renderer's window,
  // so the main process intercepts them via before-input-event and forwards via IPC.
  const handleShortcut = useCallback(
    (input: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }) => {
      if (input.ctrl && input.key === 'w') {
        closeFocusedPane();
      } else if (input.ctrl && input.key === 't') {
        openTab();
      } else if (input.ctrl && input.key === 'Tab') {
        const { tabs: t, activeTabId: aId } = useBrowserStore.getState();
        if (t.length < 2) return;
        const idx = t.findIndex(tab => tab.id === aId);
        const next = input.shift ? (idx - 1 + t.length) % t.length : (idx + 1) % t.length;
        switchTab(t[next].id);
      } else if (input.ctrl && input.key === 'l') {
        urlInputRef.current?.focus();
      } else if (input.ctrl && input.key === 'f') {
        // Open (or re-focus) the in-page find bar for the active pane.
        setIsFindOpen(true);
      } else if (input.ctrl && input.key === 'r') {
        reload();
      } else if (input.alt && input.key === 'ArrowLeft') {
        goBack();
      } else if (input.alt && input.key === 'ArrowRight') {
        goForward();
      }
    },
    []
  );

  // Keyboard shortcuts — local keydown for when renderer has focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const key = e.key;

      const isHandled =
        (ctrl &&
          (key === 'w' ||
            key === 't' ||
            key === 'Tab' ||
            key === 'l' ||
            key === 'f' ||
            key === 'r')) ||
        (alt && (key === 'ArrowLeft' || key === 'ArrowRight'));

      if (isHandled) {
        e.preventDefault();
        handleShortcut({ key, ctrl, shift: e.shiftKey, alt });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShortcut]);

  // Keyboard shortcuts — IPC-forwarded from webview's before-input-event
  useEffect(() => {
    const cleanup = window.electronAPI?.browser?.onShortcut?.(handleShortcut);
    return () => cleanup?.();
  }, [handleShortcut]);

  // Mouse side buttons (X1/X2) → back/forward, the desktop-browser convention.
  // This covers clicks over the app chrome; clicks inside a <webview> guest are
  // handled by a DOM listener injected into the guest (see did-attach-webview in
  // the main process), since the guest's mouse events don't reach this window.
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Sync URL input with active pane URL (show empty for new tab page)
  useEffect(() => {
    if (activePane && !isAddressBarFocused) {
      setUrlInput(isNewTabUrl(activePane.url) ? '' : activePane.url);
    }
  }, [activePane?.url, activePane?.id, isAddressBarFocused]);

  const isActivePaneNewTab = activePane ? isNewTabUrl(activePane.url) : false;

  // Focus the URL bar when landing on a blank tab so the user can type immediately
  useEffect(() => {
    if (!isActivePaneNewTab) return;
    const raf = requestAnimationFrame(() => {
      urlInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [activePaneId, isActivePaneNewTab]);

  // When navigating from a NewTabPage, swap that specific leaf into a webview.
  // Scoped to a paneId rather than the active pane so a NewTabPage rendered in
  // one half of a split doesn't accidentally redirect the other pane.
  const handleNewTabNavigate = useCallback((paneId: string, url: string) => {
    const { updateTabState } = useBrowserStore.getState();
    updateTabState(paneId, { url, isLoading: true });
  }, []);

  // Home button: go back to new tab page
  const handleGoHome = useCallback(() => {
    if (!activePane) return;
    const { updateTabState } = useBrowserStore.getState();
    unregisterWebview(activePane.id);
    updateTabState(activePane.id, {
      url: NEW_TAB_URL,
      title: t('tabs.newTab'),
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
    });
  }, [activePane, t]);

  const handlePaneClick = useCallback((paneId: string) => {
    useBrowserStore.getState().focusPane(paneId);
  }, []);

  // Favorites: the active pane's URL drives the toolbar star's filled state;
  // toggling captures the live url/title/favicon from the focused leaf.
  const isCurrentFavorite = activePane ? favorites.some(f => f.url === activePane.url) : false;

  const handleToggleFavorite = useCallback(() => {
    if (!activePane) return;
    useBrowserStore.getState().toggleFavorite(activePane.url, activePane.title, activePane.favicon);
  }, [activePane]);

  const handleOpenFavoriteInNewTab = useCallback((url: string) => {
    useBrowserStore.getState().openTab(url);
  }, []);

  const handleSplitterStart = useCallback(() => setIsResizing(true), []);
  const handleSplitterEnd = useCallback(() => setIsResizing(false), []);

  // Flat list of every leaf currently in the tree, deduplicated by paneId.
  // Each leaf maps to one persistent webview container in the layer below.
  // Skips new-tab leaves — they show NewTabPage instead.
  const liveLeaves = useMemo(() => {
    const seen = new Set<string>();
    const out: BrowserLeafNode[] = [];
    for (const tab of tabs) {
      for (const leaf of collectLeaves(tab)) {
        if (seen.has(leaf.id) || isNewTabUrl(leaf.url)) continue;
        seen.add(leaf.id);
        out.push(leaf);
      }
    }
    return out;
  }, [tabs]);

  const webviewLayerRef = useRef<HTMLDivElement>(null);

  // Per-pane container DOM nodes. Created lazily, appended to webviewLayer
  // once, then never reparented for the pane's entire lifetime — Electron
  // <webview> destroys its guest WebContents on disconnectedCallback, so the
  // only legal mutations are CSS position/size/display. React portals render
  // <BrowserWebview> into these containers; the portal indirection keeps the
  // React tree stable across split/unsplit while the DOM stays put.
  const paneContainersRef = useRef(new Map<string, HTMLDivElement>());

  const getOrCreatePaneContainer = useCallback(
    (paneId: string): HTMLDivElement => {
      let el = paneContainersRef.current.get(paneId);
      if (!el) {
        el = document.createElement('div');
        el.setAttribute('data-pane-id', paneId);
        el.style.position = 'absolute';
        el.style.display = 'none';
        el.style.pointerEvents = 'auto';
        // Pane focus is driven by onMouseDownCapture, but the floating
        // container — not the leaf wrapper — holds the webview, so wire the
        // focus handler directly on the container here.
        el.addEventListener('mousedown', () => handlePaneClick(paneId), true);
        paneContainersRef.current.set(paneId, el);
      }
      // Append on first chance after the layer ref attaches; subsequent calls
      // are no-ops because the parent is already the layer.
      const layer = webviewLayerRef.current;
      if (layer && el.parentElement !== layer) {
        layer.appendChild(el);
      }
      return el;
    },
    [handlePaneClick]
  );

  // Drop containers for panes that are gone from the tree.
  useEffect(() => {
    const live = new Set(liveLeaves.map(l => l.id));
    for (const [paneId, el] of paneContainersRef.current) {
      if (!live.has(paneId)) {
        el.remove();
        paneContainersRef.current.delete(paneId);
      }
    }
  }, [liveLeaves]);

  // Position each pane's container over its slot's bounding rect. Slots are
  // measurement-only DOM markers; never move the container in the DOM tree.
  useLayoutEffect(() => {
    const layer = webviewLayerRef.current;
    if (!layer) return;
    const root = layer.ownerDocument ?? document;

    // First-render race: portals created containers before the layer ref was
    // attached, so they may still be orphans. Adopt them now (this is the
    // only legal time the container's parent is allowed to change).
    for (const el of paneContainersRef.current.values()) {
      if (el.parentElement !== layer) layer.appendChild(el);
    }

    const syncPane = (paneId: string, slot: HTMLElement | null) => {
      const container = paneContainersRef.current.get(paneId);
      if (!container) return;
      if (!slot) {
        container.style.display = 'none';
        return;
      }
      const sr = slot.getBoundingClientRect();
      // Hidden tab wrappers (display:none) report a zero rect — park the
      // container offscreen instead of overlaying nothing.
      if (sr.width === 0 || sr.height === 0) {
        container.style.display = 'none';
        return;
      }
      const lr = layer.getBoundingClientRect();
      container.style.display = 'block';
      container.style.left = `${sr.left - lr.left}px`;
      container.style.top = `${sr.top - lr.top}px`;
      container.style.width = `${sr.width}px`;
      container.style.height = `${sr.height}px`;
    };

    const collectSlots = () => {
      const slots = new Map<string, HTMLElement>();
      for (const slot of root.querySelectorAll<HTMLElement>(`[${PANE_SLOT_ATTR}]`)) {
        const id = slot.getAttribute(PANE_SLOT_ATTR);
        if (id) slots.set(id, slot);
      }
      return slots;
    };

    const syncAll = () => {
      const slots = collectSlots();
      for (const leaf of liveLeaves) syncPane(leaf.id, slots.get(leaf.id) ?? null);
    };

    syncAll();

    const ro = new ResizeObserver(syncAll);
    for (const slot of collectSlots().values()) ro.observe(slot);
    // Layer can move without slots resizing (e.g. window edge moves) — cover
    // that with a window resize listener too.
    window.addEventListener('resize', syncAll);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncAll);
    };
  }, [liveLeaves, tabs, activeTabId]);

  // Splitter drag: neutralise webview pointer events so the resize gesture
  // tracks on the host page instead of being swallowed by guest content.
  useEffect(() => {
    const value = isResizing ? 'none' : 'auto';
    for (const el of paneContainersRef.current.values()) {
      el.style.pointerEvents = value;
    }
  }, [isResizing]);

  return {
    tabs,
    activeTabId,
    activePaneId,
    splitTabsEnabled,
    isFullScreen,
    activePane,
    isActivePaneNewTab,
    isCurrentFavorite,
    urlInput,
    setUrlInput,
    isAddToLibraryOpen,
    setIsAddToLibraryOpen,
    isResizing,
    isFindOpen,
    setIsFindOpen,
    isHistoryOpen,
    setIsHistoryOpen,
    urlInputRef,
    webviewLayerRef,
    liveLeaves,
    getOrCreatePaneContainer,
    handleNewTabNavigate,
    handleGoHome,
    handleToggleFavorite,
    handleOpenFavoriteInNewTab,
    handlePaneClick,
    handleSplitterStart,
    handleSplitterEnd,
    openTab,
    closeTab,
    switchTab,
    reorderTabs,
    navigate,
    goBack,
    goForward,
    reload,
    splitTabs,
  };
}
