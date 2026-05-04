import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { arrayMove } from '@dnd-kit/sortable';
import type { BrowserLeafNode, BrowserNode, BrowserSplitNode, BrowserTab } from '@shiroani/shared';
import { createLogger, NEW_TAB_URL } from '@shiroani/shared';
import { getWebview, unregisterWebview } from '@/components/browser/webviewRefs';
import { normalizeUrl, normalizeWhitelistHost } from '@/lib/url-utils';
import { electronStoreGet, electronStoreSet, electronStoreDelete } from '@/lib/electron-store';
import { updateAnimePresenceDebounced } from '@/lib/anime-detection';

const logger = createLogger('BrowserStore');

/** Keep renderer state in lockstep with the main-process slice in browser IPC. */
const MAX_ADBLOCK_WHITELIST_ENTRIES = 500;

interface BrowserState {
  tabs: BrowserNode[];
  activeTabId: string | null;
  /**
   * Identifier of the focused leaf within the active tab. For a flat tab this
   * equals the tab id; for a split tab it points at one of the child leaves.
   */
  activePaneId: string | null;
  isAddressBarFocused: boolean;
  adblockEnabled: boolean;
  popupBlockEnabled: boolean;
  /** Top-frame hostnames where adblock network filtering is disabled. */
  adblockWhitelist: string[];
  /** Whether to restore the previous session's tabs on app start. */
  restoreTabsOnStartup: boolean;
  /** Whether dragging a tab onto another opens them side by side. */
  splitTabsEnabled: boolean;
  isFullScreen: boolean;
}

interface BrowserActions {
  openTab: (url?: string) => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  reorderTabs: (activeId: string, overId: string) => void;
  navigate: (url: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  /**
   * Patch a leaf within the tab tree. The `paneId` is the leaf id; it equals
   * the tab id for non-split tabs.
   */
  updateTabState: (paneId: string, updates: Partial<BrowserTab>) => void;
  setAddressBarFocused: (focused: boolean) => void;
  setAdblockEnabled: (enabled: boolean) => void;
  toggleAdblock: () => void;
  setPopupBlockEnabled: (enabled: boolean) => void;
  togglePopupBlock: () => void;
  addAdblockDomain: (host: string) => void;
  removeAdblockDomain: (host: string) => void;
  setRestoreTabsOnStartup: (enabled: boolean) => void;
  setSplitTabsEnabled: (enabled: boolean) => Promise<void>;
  splitTabs: (sourceTabId: string, targetTabId: string) => void;
  unsplitTab: (splitNodeId: string) => void;
  setSplitRatio: (splitNodeId: string, ratio: number) => void;
  focusPane: (paneId: string) => void;
  closeFocusedPane: () => void;
  persistTabs: () => void;
  restoreTabs: () => Promise<void>;
}

type BrowserStore = BrowserState & BrowserActions;

// Debounce timer for tab persistence
let persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 1000;

// ── Tree helpers ─────────────────────────────────────────────────

/** First leaf encountered in a depth-first walk — used to seed activePaneId. */
function firstLeaf(node: BrowserNode): BrowserLeafNode {
  return node.kind === 'leaf' ? node : firstLeaf(node.left);
}

/** Find a leaf with the given id anywhere in the tree, or null. */
function findLeaf(node: BrowserNode, id: string): BrowserLeafNode | null {
  if (node.kind === 'leaf') return node.id === id ? node : null;
  return findLeaf(node.left, id) ?? findLeaf(node.right, id);
}

/** Walk a list of top-level tabs and return the leaf matching `id`, or null. */
export function findLeafById(tabs: BrowserNode[], id: string): BrowserLeafNode | null {
  for (const tab of tabs) {
    const leaf = findLeaf(tab, id);
    if (leaf) return leaf;
  }
  return null;
}

/** Find the top-level tab that contains the given pane id. */
function findTabContainingPane(tabs: BrowserNode[], paneId: string): BrowserNode | null {
  for (const tab of tabs) {
    if (findLeaf(tab, paneId)) return tab;
  }
  return null;
}

/** Map every leaf in a node by paneId, replacing it with the result of `fn`. */
function mapLeaves(node: BrowserNode, fn: (leaf: BrowserLeafNode) => BrowserLeafNode): BrowserNode {
  if (node.kind === 'leaf') return fn(node);
  const left = mapLeaves(node.left, fn);
  const right = mapLeaves(node.right, fn);
  if (left === node.left && right === node.right) return node;
  return { ...node, left, right };
}

/** Rewrite a single leaf in a node, returning a structurally-shared tree. */
function updateLeaf(node: BrowserNode, paneId: string, updates: Partial<BrowserTab>): BrowserNode {
  return mapLeaves(node, leaf => (leaf.id === paneId ? { ...leaf, ...updates } : leaf));
}

/** Locate the parent split (if any) of a given child node id within `tabs`. */
function findParentSplit(
  tabs: BrowserNode[],
  childId: string
): { parent: BrowserSplitNode; tabIndex: number } | null {
  function walk(
    node: BrowserNode,
    tabIndex: number
  ): { parent: BrowserSplitNode; tabIndex: number } | null {
    if (node.kind === 'leaf') return null;
    if (node.left.id === childId || node.right.id === childId) {
      return { parent: node, tabIndex };
    }
    return walk(node.left, tabIndex) ?? walk(node.right, tabIndex);
  }
  for (let i = 0; i < tabs.length; i++) {
    const found = walk(tabs[i], i);
    if (found) return found;
  }
  return null;
}

/** Replace a node anywhere in the tree by id. Returns the new root or `null` if not found. */
function replaceNode(
  node: BrowserNode,
  targetId: string,
  replacement: BrowserNode
): BrowserNode | null {
  if (node.id === targetId) return replacement;
  if (node.kind === 'leaf') return null;
  const left = replaceNode(node.left, targetId, replacement);
  if (left) return { ...node, left };
  const right = replaceNode(node.right, targetId, replacement);
  if (right) return { ...node, right };
  return null;
}

/** Collect every leaf in a node (used by closeTab to unregister webviews). */
function collectLeaves(node: BrowserNode): BrowserLeafNode[] {
  if (node.kind === 'leaf') return [node];
  return [...collectLeaves(node.left), ...collectLeaves(node.right)];
}

/**
 * Persist the browser-settings slice (adblock toggle, popup switch, whitelist)
 * back to electron-store, merging with whatever else lives under that key.
 */
async function persistBrowserSettings(updates: {
  adblockEnabled?: boolean;
  popupBlockEnabled?: boolean;
  adblockWhitelist?: string[];
  restoreTabsOnStartup?: boolean;
  splitTabsEnabled?: boolean;
}): Promise<void> {
  const existing = (await electronStoreGet<Record<string, unknown>>('browser-settings')) ?? {};
  await electronStoreSet('browser-settings', { ...existing, ...updates });
}

export const useBrowserStore = create<BrowserStore>()(
  maybeDevtools(
    (set, get) => ({
      // State
      tabs: [],
      activeTabId: null,
      activePaneId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      popupBlockEnabled: true,
      adblockWhitelist: [],
      restoreTabsOnStartup: true,
      splitTabsEnabled: true,
      isFullScreen: false,

      // ── Tab CRUD (all local now) ────────────────────────────────

      openTab: (url?: string) => {
        const targetUrl = typeof url === 'string' ? url : NEW_TAB_URL;
        const tabId = crypto.randomUUID();

        const newTab: BrowserLeafNode = {
          kind: 'leaf',
          id: tabId,
          url: targetUrl,
          title: 'Nowa karta',
          isLoading: targetUrl !== NEW_TAB_URL,
          canGoBack: false,
          canGoForward: false,
        };

        set(
          state => ({
            tabs: [...state.tabs, newTab],
            activeTabId: tabId,
            activePaneId: tabId,
          }),
          undefined,
          'browser/openTab'
        );

        logger.debug(`Tab created: ${tabId} → ${targetUrl}`);
      },

      closeTab: (tabId: string) => {
        const { tabs, activeTabId } = get();
        const index = tabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        // Unregister webview refs for every leaf inside the closed tab
        for (const leaf of collectLeaves(tabs[index])) {
          unregisterWebview(leaf.id);
        }

        const newTabs = tabs.filter(t => t.id !== tabId);
        let newActiveTabId = activeTabId;
        let newActivePaneId: string | null = get().activePaneId;

        if (activeTabId === tabId) {
          if (newTabs.length > 0) {
            const next = newTabs[Math.min(index, newTabs.length - 1)];
            newActiveTabId = next.id;
            newActivePaneId = firstLeaf(next).id;
          } else {
            newActiveTabId = null;
            newActivePaneId = null;
          }
        }

        set(
          { tabs: newTabs, activeTabId: newActiveTabId, activePaneId: newActivePaneId },
          undefined,
          'browser/closeTab'
        );
        get().persistTabs();
      },

      switchTab: (tabId: string) => {
        const { tabs } = get();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return;

        const paneId = firstLeaf(tab).id;
        set({ activeTabId: tabId, activePaneId: paneId }, undefined, 'browser/switchTab');
        // Re-evaluate anime detection on the newly-focused pane. Without this,
        // switching from an anime tab to a non-anime tab whose URL/title
        // doesn't change leaves `setWatchingAnime(true)` stuck and
        // `animeWatchSeconds` keeps incrementing for the wrong tab.
        updateAnimePresenceDebounced(paneId);
      },

      reorderTabs: (activeId: string, overId: string) => {
        const { tabs } = get();
        const oldIndex = tabs.findIndex(t => t.id === activeId);
        const newIndex = tabs.findIndex(t => t.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(tabs, oldIndex, newIndex);
        set({ tabs: reordered }, undefined, 'browser/reorderTabs');
        get().persistTabs();
      },

      // ── Navigation (calls webview methods directly) ─────────────

      navigate: (url: string) => {
        const { activePaneId, updateTabState } = get();
        if (!activePaneId) return;

        const normalizedUrl = normalizeUrl(url);
        const webview = getWebview(activePaneId);

        if (!webview) {
          // No webview (e.g., new tab page) — update state to trigger webview mount
          updateTabState(activePaneId, { url: normalizedUrl, isLoading: true });
          return;
        }

        webview.loadURL(normalizedUrl).catch((err: Error) => {
          logger.error(`Failed to navigate pane ${activePaneId}:`, err.message);
        });
      },

      goBack: () => {
        const { activePaneId } = get();
        if (!activePaneId) return;
        getWebview(activePaneId)?.goBack();
      },

      goForward: () => {
        const { activePaneId } = get();
        if (!activePaneId) return;
        getWebview(activePaneId)?.goForward();
      },

      reload: () => {
        const { activePaneId } = get();
        if (!activePaneId) return;
        getWebview(activePaneId)?.reload();
      },

      // ── State updates ───────────────────────────────────────────

      updateTabState: (paneId: string, updates: Partial<BrowserTab>) => {
        set(
          state => ({
            tabs: state.tabs.map(tab => updateLeaf(tab, paneId, updates)),
          }),
          undefined,
          'browser/updateTabState'
        );
        // Debounced persistence when a leaf's URL or title changes.
        if (updates.url || updates.title) {
          get().persistTabs();
        }
      },

      // ── Split / unsplit ─────────────────────────────────────────

      splitTabs: (sourceTabId: string, targetTabId: string) => {
        // Honour the user's setting at the store boundary, not just in the UI.
        // A stale or async caller (e.g. drag started before the toggle flipped)
        // can still reach this action; this guard makes the off-state final.
        if (!get().splitTabsEnabled) return;
        if (sourceTabId === targetTabId) return;
        const { tabs, activeTabId } = get();

        const sourceIndex = tabs.findIndex(t => t.id === sourceTabId);
        const targetIndex = tabs.findIndex(t => t.id === targetTabId);
        if (sourceIndex === -1 || targetIndex === -1) return;

        const source = tabs[sourceIndex];
        const target = tabs[targetIndex];

        const splitNode: BrowserSplitNode = {
          kind: 'split',
          id: crypto.randomUUID(),
          orientation: 'horizontal',
          ratio: 0.5,
          left: target,
          right: source,
        };

        // Remove the source tab from its old slot, replace target in place.
        const next = tabs.filter((_, i) => i !== sourceIndex);
        const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next[adjustedTargetIndex] = splitNode;

        // Active tab becomes the split if either the source or the target was active.
        const wasActive = activeTabId === sourceTabId || activeTabId === targetTabId;
        const newActiveTabId = wasActive ? splitNode.id : activeTabId;
        const newActivePaneId = wasActive ? firstLeaf(target).id : get().activePaneId;

        set(
          { tabs: next, activeTabId: newActiveTabId, activePaneId: newActivePaneId },
          undefined,
          'browser/splitTabs'
        );
        get().persistTabs();
      },

      unsplitTab: (splitNodeId: string) => {
        const { tabs, activePaneId } = get();
        const tabIndex = tabs.findIndex(t => t.id === splitNodeId);
        if (tabIndex === -1) return;
        const node = tabs[tabIndex];
        if (node.kind !== 'split') return;

        // Keep the focused leaf in place; evict the other to a new top-level tab.
        const focusedIsLeft = activePaneId !== null && findLeaf(node.left, activePaneId) !== null;
        const keep = focusedIsLeft ? node.left : node.right;
        const evict = focusedIsLeft ? node.right : node.left;

        const next = [...tabs];
        next[tabIndex] = keep;
        next.splice(tabIndex + 1, 0, evict);

        const newActiveTabId = keep.id;
        const newActivePaneId = firstLeaf(keep).id;

        set(
          { tabs: next, activeTabId: newActiveTabId, activePaneId: newActivePaneId },
          undefined,
          'browser/unsplitTab'
        );
        get().persistTabs();
      },

      setSplitRatio: (splitNodeId: string, ratio: number) => {
        const clamped = Math.min(0.8, Math.max(0.2, ratio));
        const { tabs } = get();

        // Single-pass walk: find + rewrite in one traversal. Each tab is
        // probed at the root; if the split is inside, the recursion returns
        // either an updated subtree or an `unchanged` marker (ratio already
        // matches). Tabs that don't contain the split skip after the first
        // descent and pass through by reference.
        for (let i = 0; i < tabs.length; i++) {
          const result = applySplitRatio(tabs[i], splitNodeId, clamped);
          if (!result) continue;
          if (result.kind === 'unchanged') return;
          const next = tabs.slice();
          next[i] = result.node;
          set({ tabs: next }, undefined, 'browser/setSplitRatio');
          return;
        }
      },

      focusPane: (paneId: string) => {
        const { tabs } = get();
        const tab = findTabContainingPane(tabs, paneId);
        if (!tab) return;
        set({ activeTabId: tab.id, activePaneId: paneId }, undefined, 'browser/focusPane');
        updateAnimePresenceDebounced(paneId);
      },

      closeFocusedPane: () => {
        const { tabs, activePaneId, activeTabId } = get();
        if (!activePaneId || !activeTabId) return;

        const parent = findParentSplit(tabs, activePaneId);
        if (!parent) {
          // Pane has no split parent — focused pane is a top-level leaf, close the tab.
          get().closeTab(activeTabId);
          return;
        }

        const { parent: split, tabIndex } = parent;
        const survivor = split.left.id === activePaneId ? split.right : split.left;

        unregisterWebview(activePaneId);

        const tab = tabs[tabIndex];
        const newTab =
          tab.id === split.id ? survivor : (replaceNode(tab, split.id, survivor) ?? tab);

        const next = [...tabs];
        next[tabIndex] = newTab;

        const newActiveTabId = newTab.id;
        const newActivePaneId = firstLeaf(newTab).id;

        set(
          { tabs: next, activeTabId: newActiveTabId, activePaneId: newActivePaneId },
          undefined,
          'browser/closeFocusedPane'
        );
        get().persistTabs();
      },

      setAddressBarFocused: (focused: boolean) => {
        set({ isAddressBarFocused: focused }, undefined, 'browser/setAddressBarFocused');
      },

      setAdblockEnabled: async (enabled: boolean) => {
        const previous = get().adblockEnabled;
        set({ adblockEnabled: enabled }, undefined, 'browser/setAdblockEnabled');
        try {
          await window.electronAPI?.browser?.toggleAdblock(enabled);
          await persistBrowserSettings({ adblockEnabled: enabled });
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist adblockEnabled', err);
          set({ adblockEnabled: previous }, undefined, 'browser/setAdblockEnabled:revert');
        }
      },

      toggleAdblock: () => {
        const enabled = !get().adblockEnabled;
        get().setAdblockEnabled(enabled);
      },

      setPopupBlockEnabled: async (enabled: boolean) => {
        const previous = get().popupBlockEnabled;
        set({ popupBlockEnabled: enabled }, undefined, 'browser/setPopupBlockEnabled');
        try {
          await window.electronAPI?.browser?.setPopupBlockEnabled(enabled);
          await persistBrowserSettings({ popupBlockEnabled: enabled });
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist popupBlockEnabled', err);
          set({ popupBlockEnabled: previous }, undefined, 'browser/setPopupBlockEnabled:revert');
        }
      },

      togglePopupBlock: () => {
        get().setPopupBlockEnabled(!get().popupBlockEnabled);
      },

      addAdblockDomain: (host: string) => {
        const normalized = normalizeWhitelistHost(host);
        if (!normalized) return;

        const current = get().adblockWhitelist;
        if (current.includes(normalized)) return;
        // Main process silently slices to MAX_ADBLOCK_WHITELIST_ENTRIES; mirror
        // that here so renderer state matches what's actually applied.
        if (current.length >= MAX_ADBLOCK_WHITELIST_ENTRIES) return;

        const next = [...current, normalized];
        set({ adblockWhitelist: next }, undefined, 'browser/addAdblockDomain');
        void window.electronAPI?.browser?.setAdblockWhitelist?.(next);
        void persistBrowserSettings({ adblockWhitelist: next });
      },

      setRestoreTabsOnStartup: async (enabled: boolean) => {
        const previous = get().restoreTabsOnStartup;
        set({ restoreTabsOnStartup: enabled }, undefined, 'browser/setRestoreTabsOnStartup');
        try {
          await persistBrowserSettings({ restoreTabsOnStartup: enabled });
          // When turning off, drop any stored tabs so toggling back on
          // doesn't resurrect a stale session the user can't see anymore.
          if (!enabled) {
            electronStoreDelete('browser-tabs');
          }
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist restoreTabsOnStartup', err);
          set(
            { restoreTabsOnStartup: previous },
            undefined,
            'browser/setRestoreTabsOnStartup:revert'
          );
        }
      },

      setSplitTabsEnabled: async (enabled: boolean) => {
        const previous = get().splitTabsEnabled;
        set({ splitTabsEnabled: enabled }, undefined, 'browser/setSplitTabsEnabled');
        // When the feature is disabled, flatten any open splits into adjacent
        // tabs so the user is not left with a UI they can no longer manage.
        // Build the flat list deterministically via collectLeaves rather than
        // looping unsplitTab — unsplitTab is focus-biased and single-pass, so
        // it can leave nested splits intact or evict leaves in reversed order.
        if (!enabled) {
          const { tabs, activePaneId } = get();
          const hasSplits = tabs.some(t => t.kind === 'split');
          if (hasSplits) {
            const flat: BrowserLeafNode[] = [];
            for (const tab of tabs) {
              for (const leaf of collectLeaves(tab)) flat.push(leaf);
            }
            const stillFocused = activePaneId ? flat.find(l => l.id === activePaneId) : undefined;
            const newActive = stillFocused ?? flat[0] ?? null;
            set(
              {
                tabs: flat,
                activeTabId: newActive?.id ?? null,
                activePaneId: newActive?.id ?? null,
              },
              undefined,
              'browser/setSplitTabsEnabled:flatten'
            );
            get().persistTabs();
          }
        }
        try {
          await persistBrowserSettings({ splitTabsEnabled: enabled });
        } catch (err) {
          logger.warn('useBrowserStore: failed to persist splitTabsEnabled', err);
          set({ splitTabsEnabled: previous }, undefined, 'browser/setSplitTabsEnabled:revert');
        }
      },

      removeAdblockDomain: (host: string) => {
        const normalized = normalizeWhitelistHost(host);
        if (!normalized) return;

        const current = get().adblockWhitelist;
        if (!current.includes(normalized)) return;

        const next = current.filter(h => h !== normalized);
        set({ adblockWhitelist: next }, undefined, 'browser/removeAdblockDomain');
        void window.electronAPI?.browser?.setAdblockWhitelist?.(next);
        void persistBrowserSettings({ adblockWhitelist: next });
      },

      // ── Persistence ─────────────────────────────────────────────

      persistTabs: () => {
        // Gated by the "Przywróć karty po restarcie" toggle — when off we
        // drop writes entirely so nothing lingers under the store key.
        if (!get().restoreTabsOnStartup) return;

        if (persistTimer) clearTimeout(persistTimer);
        persistTimer = setTimeout(() => {
          const { tabs, activePaneId } = get();
          // Splits flatten to two adjacent leaves on disk: across a restart,
          // the user sees two regular tabs side-by-side in the strip rather
          // than a re-hydrated split. Session state (the split structure)
          // is intentionally not preserved.
          const flat: Array<{ url: string; title: string; isActive: boolean }> = [];
          for (const tab of tabs) {
            const leaves = collectLeaves(tab).filter(l => l.url && l.url !== 'about:blank');
            for (const leaf of leaves) {
              flat.push({
                url: leaf.url,
                title: leaf.title,
                isActive: leaf.id === activePaneId,
              });
            }
          }

          if (flat.length === 0) {
            electronStoreDelete('browser-tabs');
            return;
          }

          const activeIndex = Math.max(
            0,
            flat.findIndex(t => t.isActive)
          );

          const state = {
            tabs: flat.map(({ url, title }) => ({ url, title })),
            activeIndex,
          };

          electronStoreSet('browser-tabs', state);
          logger.debug(`Persisted ${flat.length} tab(s)`);
        }, PERSIST_DEBOUNCE_MS);
      },

      restoreTabs: async () => {
        // Restore browser settings (adblock toggle, popup switch, whitelist).
        // Legacy `popupBlockMode` string is migrated to the new boolean shape.
        const settings = await electronStoreGet<{
          adblockEnabled?: boolean;
          popupBlockEnabled?: boolean;
          popupBlockMode?: string;
          adblockWhitelist?: unknown;
          restoreTabsOnStartup?: boolean;
          splitTabsEnabled?: boolean;
        }>('browser-settings');

        if (settings) {
          if (typeof settings.adblockEnabled === 'boolean') {
            set({ adblockEnabled: settings.adblockEnabled });
          }

          // Popup block: prefer the new boolean, fall back to legacy string.
          let popupEnabled: boolean | null = null;
          if (typeof settings.popupBlockEnabled === 'boolean') {
            popupEnabled = settings.popupBlockEnabled;
          } else if (typeof settings.popupBlockMode === 'string') {
            // Legacy migration: 'off' → false, anything else ('smart' | 'strict') → true
            popupEnabled = settings.popupBlockMode !== 'off';
          }
          if (popupEnabled !== null) {
            set({ popupBlockEnabled: popupEnabled });
            // Sync with main process and persist in the new shape so this
            // migration runs at most once.
            void window.electronAPI?.browser?.setPopupBlockEnabled?.(popupEnabled);
            void persistBrowserSettings({ popupBlockEnabled: popupEnabled });
          }

          if (typeof settings.restoreTabsOnStartup === 'boolean') {
            set({ restoreTabsOnStartup: settings.restoreTabsOnStartup });
          }

          if (typeof settings.splitTabsEnabled === 'boolean') {
            set({ splitTabsEnabled: settings.splitTabsEnabled });
          }

          // Restore + push whitelist to main
          if (Array.isArray(settings.adblockWhitelist)) {
            const cleaned = Array.from(
              new Set(
                settings.adblockWhitelist
                  .filter((h): h is string => typeof h === 'string')
                  .map(h => normalizeWhitelistHost(h))
                  .filter(h => h.length > 0)
              )
            );
            set({ adblockWhitelist: cleaned });
            void window.electronAPI?.browser?.setAdblockWhitelist?.(cleaned);
          }
        }

        // Restore tabs (unless the user disabled session restore)
        if (!get().restoreTabsOnStartup) return;

        const saved = await electronStoreGet<unknown>('browser-tabs');
        const migrated = migratePersistedTabs(saved);

        if (migrated && migrated.tabs.length > 0) {
          const restoredTabs: BrowserNode[] = migrated.tabs.map(t => ({
            kind: 'leaf',
            id: crypto.randomUUID(),
            url: t.url,
            title: t.title || 'Nowa karta',
            isLoading: t.url !== NEW_TAB_URL, // New tab pages don't load
            canGoBack: false,
            canGoForward: false,
          }));

          const activeIndex = Math.min(migrated.activeIndex, restoredTabs.length - 1);
          const activeNode = restoredTabs[Math.max(0, activeIndex)];

          set(
            {
              tabs: restoredTabs,
              activeTabId: activeNode?.id ?? null,
              activePaneId: activeNode ? firstLeaf(activeNode).id : null,
            },
            undefined,
            'browser/restoreTabs'
          );

          logger.debug(`Restored ${restoredTabs.length} tab(s)`);
        }
      },
    }),
    { name: 'browser' }
  )
);

/**
 * Validate and normalise the persisted browser-tabs payload. Defensive: any
 * unexpected shape from a future version (or a corrupted entry) is dropped
 * rather than crashing the restore. Splits were never persisted, so the
 * incoming shape is always a flat array even after the chunk-9 schema update.
 */
function migratePersistedTabs(
  raw: unknown
): { tabs: Array<{ url: string; title: string }>; activeIndex: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { tabs?: unknown; activeIndex?: unknown };
  if (!Array.isArray(candidate.tabs)) return null;

  const tabs: Array<{ url: string; title: string }> = [];
  for (const entry of candidate.tabs) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as { url?: unknown; title?: unknown };
    if (typeof e.url !== 'string' || e.url.length === 0) continue;
    tabs.push({ url: e.url, title: typeof e.title === 'string' ? e.title : '' });
  }

  const activeIndex =
    typeof candidate.activeIndex === 'number' && Number.isFinite(candidate.activeIndex)
      ? candidate.activeIndex
      : 0;

  return { tabs, activeIndex };
}

/**
 * Single-pass split-ratio update. Returns `null` when the split id is not in
 * this subtree (caller keeps searching), `{ kind: 'unchanged' }` when the
 * split was found but the ratio already matches (caller stops without a
 * state mutation), or `{ kind: 'updated', node }` with a structurally-shared
 * rewrite of the subtree.
 */
type SplitRatioResult = { kind: 'unchanged' } | { kind: 'updated'; node: BrowserNode } | null;

function applySplitRatio(node: BrowserNode, id: string, ratio: number): SplitRatioResult {
  if (node.kind === 'leaf') return null;
  if (node.id === id) {
    if (node.ratio === ratio) return { kind: 'unchanged' };
    return { kind: 'updated', node: { ...node, ratio } };
  }
  const left = applySplitRatio(node.left, id, ratio);
  if (left) {
    if (left.kind === 'unchanged') return left;
    return { kind: 'updated', node: { ...node, left: left.node } };
  }
  const right = applySplitRatio(node.right, id, ratio);
  if (right) {
    if (right.kind === 'unchanged') return right;
    return { kind: 'updated', node: { ...node, right: right.node } };
  }
  return null;
}

/**
 * Resolve the currently-focused leaf from the store, or `null` when no tab is
 * active. Consumers that need URL/title from the active surface should read
 * from the leaf rather than the top-level tab.
 */
export function getActivePane(): BrowserLeafNode | null {
  const { tabs, activePaneId } = useBrowserStore.getState();
  if (!activePaneId) return null;
  for (const tab of tabs) {
    const leaf = findLeaf(tab, activePaneId);
    if (leaf) return leaf;
  }
  return null;
}
