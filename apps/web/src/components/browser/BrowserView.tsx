import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import { Globe, Columns2 } from 'lucide-react';
import {
  isNewTabUrl,
  NEW_TAB_URL,
  type BrowserLeafNode,
  type BrowserNode,
  type BrowserSplitNode,
} from '@shiroani/shared';
import { findLeafById, useBrowserStore } from '@/stores/useBrowserStore';
import { collectLeaves } from '@/stores/browser/browserTree';
import { AddToLibraryDialog } from '@/components/browser/AddToLibraryDialog';
import { BrowserTabBar } from '@/components/browser/BrowserTabBar';
import { BrowserToolbar } from '@/components/browser/BrowserToolbar';
import { BrowserWebview } from '@/components/browser/BrowserWebview';
import { NewTabPage } from '@/components/browser/NewTabPage';
import { useBrowserInit } from '@/components/browser/useBrowserInit';
import { unregisterWebview } from '@/components/browser/webviewRefs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { cn } from '@/lib/utils';
import { isEditableTarget } from '@/lib/is-editable-target';

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

interface PaneRendererProps {
  node: BrowserNode;
  activePaneId: string | null;
  /** Bound `t` instance for the `browser` namespace, threaded so renderNode stays pure. */
  t: TFunction<'browser'>;
  /**
   * Id of the enclosing SplitNode, or null when this leaf sits at the top
   * level. Drives whether the per-pane chrome bar with the unsplit button
   * is rendered.
   */
  parentSplitId: string | null;
  /**
   * When true, the splitter is being dragged. The view neutralises webview
   * pointer events at the container level so the drag isn't swallowed by
   * guest content; this prop is threaded through but has no per-leaf effect.
   */
  resizing: boolean;
  onSplitterStart: () => void;
  onSplitterEnd: () => void;
  onPaneClick: (paneId: string) => void;
  /**
   * Per-leaf new-tab navigate. Scoped to a single pane so a NewTabPage in
   * one half of a split doesn't clobber the URL of the other half.
   */
  onNewTabNavigate: (paneId: string, url: string) => void;
}

/**
 * Empty slot marker rendered where a pane should appear in the tree. The
 * pane's `<BrowserWebview>` never lives inside the slot — the slot is read
 * via `getBoundingClientRect` and a separate, never-moved container is
 * absolutely positioned over it. Electron `<webview>` destroys its guest
 * WebContents the moment its DOM node is detached, so any reparent reloads
 * the page. See `BrowserView` for the layer mechanics.
 */
const PANE_SLOT_ATTR = 'data-pane-slot';

/**
 * Slot key for a top-level tab — the id of its leftmost leaf. Stable across
 * split/unsplit transitions: when leaves A and B merge into a split, the
 * combined slot keeps the left leaf's id (matching the old A wrapper); when
 * a split unsplits, the survivor wrapper still carries the leftmost leaf's
 * id so React's reconciler reuses it. Webview lifetime is owned by the
 * portal layer below, but a stable wrapper key avoids unmounting the slot
 * subtree (and the layout-effect work that re-runs on every churn).
 */
function slotKeyForTab(node: BrowserNode): string {
  return node.kind === 'leaf' ? node.id : slotKeyForTab(node.left);
}

function PaneChrome({ leaf, parentSplitId }: { leaf: BrowserLeafNode; parentSplitId: string }) {
  const { t } = useTranslation('browser');
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-[22px] px-2 shrink-0',
        'bg-[oklch(from_var(--card)_l_c_h/0.55)] border-b border-border-glass',
        'text-[11px] text-muted-foreground'
      )}
    >
      {leaf.favicon ? (
        <img src={leaf.favicon} alt="" className="w-3 h-3 shrink-0 rounded-[2px]" />
      ) : (
        <Globe className="w-3 h-3 shrink-0 opacity-60" />
      )}
      <span className="truncate flex-1">{leaf.title || t('tabs.newTab')}</span>
      <TooltipButton
        variant="ghost"
        size="icon"
        className="size-5 rounded-sm text-muted-foreground hover:text-foreground"
        onClick={e => {
          e.stopPropagation();
          unsplitTab(parentSplitId);
        }}
        tooltip={t('tabs.unsplit')}
        tooltipSide="bottom"
      >
        <Columns2 className="w-3 h-3" />
      </TooltipButton>
    </div>
  );
}

function renderNode(props: PaneRendererProps): JSX.Element {
  const { node, activePaneId, parentSplitId, onPaneClick, onNewTabNavigate, t } = props;

  if (node.kind === 'leaf') {
    const isFocused = node.id === activePaneId;
    const showChrome = parentSplitId !== null;
    const isNewTab = isNewTabUrl(node.url);
    return (
      <div
        key={node.id}
        role="region"
        aria-label={showChrome ? t('tabs.region.pane') : t('tabs.region.tab')}
        onMouseDownCapture={() => onPaneClick(node.id)}
        className={cn(
          'relative h-full w-full overflow-hidden flex flex-col',
          isFocused && showChrome && 'ring-1 ring-inset ring-primary/40'
        )}
      >
        {showChrome && <PaneChrome leaf={node} parentSplitId={parentSplitId} />}
        <div className="relative flex-1 overflow-hidden">
          {isNewTab ? (
            // Render NewTabPage inside the leaf so split panes stay scoped:
            // sending one half home/new-tab doesn't cover the other half.
            <NewTabPage onNavigate={url => onNewTabNavigate(node.id, url)} />
          ) : (
            // Measurement target only — the webview overlay reads this rect.
            <div {...{ [PANE_SLOT_ATTR]: node.id }} className="absolute inset-0" />
          )}
        </div>
      </div>
    );
  }

  return renderSplit(node, props);
}

function renderSplit(split: BrowserSplitNode, props: PaneRendererProps): JSX.Element {
  const {
    activePaneId,
    onSplitterStart,
    onSplitterEnd,
    resizing,
    onPaneClick,
    onNewTabNavigate,
    t,
  } = props;
  const direction = split.orientation;
  const leftPercent = Math.max(20, Math.min(80, split.ratio * 100));
  const rightPercent = 100 - leftPercent;
  const leftPanelId = `${split.id}-l`;
  const rightPanelId = `${split.id}-r`;

  const handleLayoutChanged = (layout: Record<string, number>) => {
    const leftSize = layout[leftPanelId];
    if (typeof leftSize !== 'number') return;
    useBrowserStore.getState().setSplitRatio(split.id, leftSize / 100);
  };

  return (
    <ResizablePanelGroup
      key={split.id}
      id={split.id}
      orientation={direction}
      onLayoutChanged={handleLayoutChanged}
      className="h-full w-full"
    >
      <ResizablePanel id={leftPanelId} defaultSize={leftPercent} minSize={20}>
        {renderNode({
          node: split.left,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
          onNewTabNavigate,
          t,
        })}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        onPointerDownCapture={onSplitterStart}
        onPointerUp={onSplitterEnd}
        onPointerCancel={onSplitterEnd}
      />
      <ResizablePanel id={rightPanelId} defaultSize={rightPercent} minSize={20}>
        {renderNode({
          node: split.right,
          activePaneId,
          parentSplitId: split.id,
          resizing,
          onSplitterStart,
          onSplitterEnd,
          onPaneClick,
          onNewTabNavigate,
          t,
        })}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

/**
 * BrowserView: The main embedded browser interface.
 * Renders each top-level tab as a stacked layer (kept mounted across switches
 * to preserve webview state). Within a tab, the tree is rendered recursively —
 * leaves render <BrowserWebview>, splits render a ResizablePanelGroup.
 */
export function BrowserView() {
  const { t } = useTranslation('browser');
  // Granular selectors: only re-render when these specific slices change
  const tabs = useBrowserStore(useShallow(s => s.tabs));
  const activeTabId = useBrowserStore(s => s.activeTabId);
  const activePaneId = useBrowserStore(s => s.activePaneId);
  const splitTabsEnabled = useBrowserStore(s => s.splitTabsEnabled);
  const isAddressBarFocused = useBrowserStore(s => s.isAddressBarFocused);
  const isFullScreen = useBrowserStore(s => s.isFullScreen);

  const [urlInput, setUrlInput] = useState('');
  const [isAddToLibraryOpen, setIsAddToLibraryOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

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
        (ctrl && (key === 'w' || key === 't' || key === 'Tab' || key === 'l' || key === 'r')) ||
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
        // Pane focus is normally driven by onMouseDownCapture on the leaf
        // wrapper, but the wrapper no longer contains the webview — wire it
        // up directly on the floating container instead.
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

  // Drop containers for panes that no longer exist anywhere in the tree.
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
      {/* Tab bar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={switchTab}
          onCloseTab={closeTab}
          onNewTab={() => openTab()}
          onReorderTabs={reorderTabs}
          onSplitTabs={splitTabsEnabled ? splitTabs : undefined}
        />
      )}

      {/* Navigation toolbar — hidden during HTML5 fullscreen */}
      {!isFullScreen && (
        <BrowserToolbar
          urlInput={urlInput}
          onUrlInputChange={setUrlInput}
          canGoBack={activePane?.canGoBack ?? false}
          canGoForward={activePane?.canGoForward ?? false}
          isLoading={activePane?.isLoading ?? false}
          hasActiveTab={!!activePane}
          onGoBack={goBack}
          onGoForward={goForward}
          onReload={reload}
          onNavigate={navigate}
          onGoHome={handleGoHome}
          onAddToLibrary={() => setIsAddToLibraryOpen(true)}
          urlInputRef={urlInputRef}
        />
      )}

      {/* Tab content — every tab stays mounted to preserve webview state */}
      <div
        className={`flex-1 relative overflow-hidden ${isActivePaneNewTab ? '' : 'bg-background'}`}
      >
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-16 h-16 opacity-20" />
            <p className="text-sm">{t('tabs.empty.cta')}</p>
          </div>
        ) : (
          <>
            {tabs.map(tab => (
              <div
                key={slotKeyForTab(tab)}
                className={cn('absolute inset-0', tab.id === activeTabId ? 'block' : 'hidden')}
              >
                {renderNode({
                  node: tab,
                  activePaneId,
                  parentSplitId: null,
                  resizing: isResizing,
                  onSplitterStart: handleSplitterStart,
                  onSplitterEnd: handleSplitterEnd,
                  onPaneClick: handlePaneClick,
                  onNewTabNavigate: handleNewTabNavigate,
                  t,
                })}
              </div>
            ))}
            {/*
             * Stable parent for every pane's webview container. Containers
             * float absolutely inside this layer and are CSS-positioned over
             * their matching slots; the DOM never gets reparented.
             */}
            <div
              ref={webviewLayerRef}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Add to Library dialog */}
      <AddToLibraryDialog
        open={isAddToLibraryOpen}
        onOpenChange={setIsAddToLibraryOpen}
        url={activePane?.url ?? ''}
        title={activePane?.title ?? ''}
      />

      {/*
       * One <BrowserWebview> per live pane, portaled into a stable container
       * that lives in webviewLayer. The portal indirection keeps React's
       * reconciliation tree shape stable across split/unsplit, while the
       * container itself is never reparented for the pane's whole lifetime.
       */}
      {liveLeaves.map(leaf =>
        createPortal(
          <BrowserWebview paneId={leaf.id} initialUrl={leaf.url} isActive />,
          getOrCreatePaneContainer(leaf.id),
          leaf.id
        )
      )}
    </div>
  );
}
