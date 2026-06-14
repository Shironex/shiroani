import type { Dispatch, SetStateAction, RefObject } from 'react';
import type { TFunction } from 'i18next';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';

/**
 * Empty slot marker rendered where a pane should appear in the tree. The
 * pane's `<BrowserWebview>` never lives inside the slot — the slot is read
 * via `getBoundingClientRect` and a separate, never-moved container is
 * absolutely positioned over it. Electron `<webview>` destroys its guest
 * WebContents the moment its DOM node is detached, so any reparent reloads
 * the page. See `BrowserView` for the layer mechanics.
 */
export interface IPaneRendererProps {
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

export interface IBrowserViewView {
  readonly tabs: BrowserNode[];
  readonly activeTabId: string | null;
  readonly activePaneId: string | null;
  readonly splitTabsEnabled: boolean;
  readonly isFullScreen: boolean;
  readonly activePane: BrowserLeafNode | null;
  readonly isActivePaneNewTab: boolean;
  readonly urlInput: string;
  readonly setUrlInput: Dispatch<SetStateAction<string>>;
  readonly isAddToLibraryOpen: boolean;
  readonly setIsAddToLibraryOpen: Dispatch<SetStateAction<boolean>>;
  readonly isResizing: boolean;
  readonly isFindOpen: boolean;
  readonly setIsFindOpen: Dispatch<SetStateAction<boolean>>;
  readonly isHistoryOpen: boolean;
  readonly setIsHistoryOpen: Dispatch<SetStateAction<boolean>>;
  readonly urlInputRef: RefObject<HTMLInputElement | null>;
  readonly webviewLayerRef: RefObject<HTMLDivElement | null>;
  readonly liveLeaves: BrowserLeafNode[];
  readonly getOrCreatePaneContainer: (paneId: string) => HTMLDivElement;
  readonly handleNewTabNavigate: (paneId: string, url: string) => void;
  readonly handleGoHome: () => void;
  readonly handlePaneClick: (paneId: string) => void;
  readonly handleSplitterStart: () => void;
  readonly handleSplitterEnd: () => void;
  readonly openTab: () => void;
  readonly closeTab: (id: string) => void;
  readonly switchTab: (id: string) => void;
  readonly reorderTabs: (activeId: string, overId: string) => void;
  readonly navigate: (url: string) => void;
  readonly goBack: () => void;
  readonly goForward: () => void;
  readonly reload: () => void;
  readonly splitTabs: (sourceId: string, targetId: string) => void;
}
