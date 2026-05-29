import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';
import { useBrowserStore } from '../useBrowserStore';

// Mock webviewRefs — must be before importing the store
vi.mock('@/components/browser/webviewRefs', () => ({
  getWebview: vi.fn(),
  unregisterWebview: vi.fn(),
}));

// Mock platform
vi.mock('@/lib/platform', () => ({
  IS_ELECTRON: false,
}));

// In-memory electron-store double so persistence can be observed in tests.
const electronStoreData = new Map<string, unknown>();
vi.mock('@/lib/electron-store', () => ({
  createDebouncedPersist: (key: string, delayMs: number = 500) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (value: unknown) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        electronStoreData.set(key, value);
      }, delayMs);
    };
  },
  electronStoreGet: vi.fn(async (key: string) => electronStoreData.get(key)),
  electronStoreSet: vi.fn(async (key: string, value: unknown) => {
    electronStoreData.set(key, value);
  }),
  electronStoreDelete: vi.fn(async (key: string) => {
    electronStoreData.delete(key);
  }),
}));

// Provide crypto.randomUUID for jsdom
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `tab-${++uuidCounter}`,
});

/** Narrow a tree node to a leaf, failing the test if the node is a split. */
function expectLeaf(node: BrowserNode | undefined): BrowserLeafNode {
  if (!node || node.kind !== 'leaf') {
    throw new Error(`expected leaf node, got ${node?.kind ?? 'undefined'}`);
  }
  return node;
}

describe('useBrowserStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBrowserStore.setState({
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
    });
    electronStoreData.clear();
    uuidCounter = 0;
  });

  // ── openTab ───────────────────────────────────────────────────

  describe('openTab', () => {
    it('creates a new tab with default URL', () => {
      useBrowserStore.getState().openTab();

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      const leaf = expectLeaf(tabs[0]);
      expect(leaf.title).toBe('Nowa karta');
      expect(leaf.isLoading).toBe(false); // new tab page doesn't load
      expect(leaf.canGoBack).toBe(false);
      expect(leaf.canGoForward).toBe(false);
      expect(activeTabId).toBe(leaf.id);
    });

    it('creates a tab with a custom URL', () => {
      useBrowserStore.getState().openTab('https://example.com');

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('https://example.com');
    });

    it('sets the new tab as active', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(2);
      expect(activeTabId).toBe(tabs[1].id);
    });
  });

  // ── closeTab ──────────────────────────────────────────────────

  describe('closeTab', () => {
    it('removes the specified tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const tabToClose = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().closeTab(tabToClose);

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('https://b.com');
    });

    it('activates next tab when closing active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');
      useBrowserStore.getState().openTab('https://c.com');

      // Switch to middle tab and close it
      const middleTabId = useBrowserStore.getState().tabs[1].id;
      useBrowserStore.getState().switchTab(middleTabId);
      useBrowserStore.getState().closeTab(middleTabId);

      const { activeTabId, tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(2);
      // Should activate the tab at the same index (or last if index is out of bounds)
      expect(activeTabId).toBeTruthy();
    });

    it('sets activeTabId to null when closing the last tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().closeTab(tabId);

      const { tabs, activeTabId } = useBrowserStore.getState();
      expect(tabs).toHaveLength(0);
      expect(activeTabId).toBeNull();
    });

    it('does nothing for non-existent tab ID', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().closeTab('nonexistent-id');

      expect(useBrowserStore.getState().tabs).toHaveLength(1);
    });

    it('keeps active tab unchanged when closing a non-active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      const activeId = useBrowserStore.getState().activeTabId;

      useBrowserStore.getState().closeTab(firstTabId);

      expect(useBrowserStore.getState().activeTabId).toBe(activeId);
    });
  });

  // ── switchTab ─────────────────────────────────────────────────

  describe('switchTab', () => {
    it('changes the active tab', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().switchTab(firstTabId);

      expect(useBrowserStore.getState().activeTabId).toBe(firstTabId);
    });
  });

  // ── updateTabState ────────────────────────────────────────────

  describe('updateTabState', () => {
    it('updates a specific tab by ID', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;

      useBrowserStore.getState().updateTabState(tabId, {
        title: 'Updated Title',
        url: 'https://updated.com',
        isLoading: false,
      });

      const leaf = expectLeaf(useBrowserStore.getState().tabs[0]);
      expect(leaf.title).toBe('Updated Title');
      expect(leaf.url).toBe('https://updated.com');
      expect(leaf.isLoading).toBe(false);
    });

    it('does not affect other tabs', () => {
      useBrowserStore.getState().openTab('https://a.com');
      useBrowserStore.getState().openTab('https://b.com');

      const firstTabId = useBrowserStore.getState().tabs[0].id;
      useBrowserStore.getState().updateTabState(firstTabId, { title: 'Changed' });

      expect(expectLeaf(useBrowserStore.getState().tabs[1]).title).toBe('Nowa karta');
    });
  });

  // ── UI state ──────────────────────────────────────────────────

  describe('setAddressBarFocused', () => {
    it('toggles address bar focus state', () => {
      useBrowserStore.getState().setAddressBarFocused(true);
      expect(useBrowserStore.getState().isAddressBarFocused).toBe(true);

      useBrowserStore.getState().setAddressBarFocused(false);
      expect(useBrowserStore.getState().isAddressBarFocused).toBe(false);
    });
  });

  describe('toggleAdblock', () => {
    it('toggles adblock enabled state', () => {
      expect(useBrowserStore.getState().adblockEnabled).toBe(true);

      useBrowserStore.getState().toggleAdblock();
      expect(useBrowserStore.getState().adblockEnabled).toBe(false);

      useBrowserStore.getState().toggleAdblock();
      expect(useBrowserStore.getState().adblockEnabled).toBe(true);
    });
  });

  // ── Popup block switch ───────────────────────────────────────

  describe('togglePopupBlock', () => {
    it('toggles popup block enabled state', () => {
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);

      useBrowserStore.getState().togglePopupBlock();
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(false);

      useBrowserStore.getState().togglePopupBlock();
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);
    });
  });

  describe('setPopupBlockEnabled', () => {
    it('sets the value directly', () => {
      useBrowserStore.getState().setPopupBlockEnabled(false);
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(false);

      useBrowserStore.getState().setPopupBlockEnabled(true);
      expect(useBrowserStore.getState().popupBlockEnabled).toBe(true);
    });
  });

  // ── Adblock whitelist ────────────────────────────────────────

  describe('addAdblockDomain', () => {
    it('adds a bare hostname', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('normalizes hostnames (lowercase, strip www., strip protocol/path)', () => {
      useBrowserStore.getState().addAdblockDomain('  HTTPS://WWW.Example.COM/some/path?q=1  ');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('dedupes entries that normalize to the same host', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().addAdblockDomain('https://www.example.com/');
      useBrowserStore.getState().addAdblockDomain('EXAMPLE.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('rejects empty and whitespace-only input', () => {
      useBrowserStore.getState().addAdblockDomain('');
      useBrowserStore.getState().addAdblockDomain('   ');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual([]);
    });

    it('strips port suffixes', () => {
      useBrowserStore.getState().addAdblockDomain('example.com:8080');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });

    it('preserves subdomains other than www.', () => {
      useBrowserStore.getState().addAdblockDomain('sub.example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['sub.example.com']);
    });
  });

  describe('removeAdblockDomain', () => {
    it('removes a previously added host', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().addAdblockDomain('other.com');
      useBrowserStore.getState().removeAdblockDomain('example.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['other.com']);
    });

    it('normalizes the removal input', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().removeAdblockDomain('https://WWW.example.com/');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual([]);
    });

    it('is a no-op for non-existent hosts', () => {
      useBrowserStore.getState().addAdblockDomain('example.com');
      useBrowserStore.getState().removeAdblockDomain('notthere.com');
      expect(useBrowserStore.getState().adblockWhitelist).toEqual(['example.com']);
    });
  });

  // ── openTab uses NEW_TAB_URL by default ─────────────────────

  describe('openTab default URL', () => {
    it('opens new tab with NEW_TAB_URL when no URL provided', () => {
      useBrowserStore.getState().openTab();

      const { tabs } = useBrowserStore.getState();
      expect(tabs).toHaveLength(1);
      expect(expectLeaf(tabs[0]).url).toBe('shiroani://newtab');
    });
  });

  // ── Split / unsplit / focus ──────────────────────────────────

  describe('splitTabs', () => {
    it('replaces the target tab with a split containing target on the left and source on the right', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);

      store.splitTabs(aId, bId);

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      const split = tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      expect(expectLeaf(split.left).url).toBe('https://b.com');
      expect(expectLeaf(split.right).url).toBe('https://a.com');
      expect(split.ratio).toBe(0.5);
    });

    it('focuses the target leaf in the new split', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);

      store.splitTabs(aId, bId);

      const { tabs, activeTabId, activePaneId } = useBrowserStore.getState();
      const split = tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      expect(activeTabId).toBe(split.id);
      expect(activePaneId).toBe(expectLeaf(split.left).id);
    });

    it('is a no-op when source equals target', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      const [aId] = useBrowserStore.getState().tabs.map(t => t.id);

      store.splitTabs(aId, aId);

      expect(useBrowserStore.getState().tabs).toHaveLength(1);
      expect(useBrowserStore.getState().tabs[0].kind).toBe('leaf');
    });

    it('preserves a third sibling tab when splitting two tabs', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      store.openTab('https://c.com');
      const [aId, bId, cId] = useBrowserStore.getState().tabs.map(t => t.id);

      store.splitTabs(aId, bId);

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs).toHaveLength(2);
      expect(tabs[1].id).toBe(cId);
    });
  });

  describe('unsplitTab', () => {
    it('replaces the split with the focused leaf and pushes the other to a new adjacent tab', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      const splitId = useBrowserStore.getState().tabs[0].id;
      store.unsplitTab(splitId);

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs).toHaveLength(2);
      // The focused leaf was the target (https://b.com) which sits on the left
      expect(expectLeaf(tabs[0]).url).toBe('https://b.com');
      expect(expectLeaf(tabs[1]).url).toBe('https://a.com');
    });

    it('makes the kept leaf the active tab and pane', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);
      const splitId = useBrowserStore.getState().tabs[0].id;

      store.unsplitTab(splitId);

      const { tabs, activeTabId, activePaneId } = useBrowserStore.getState();
      expect(activeTabId).toBe(tabs[0].id);
      expect(activePaneId).toBe(tabs[0].id);
    });
  });

  describe('focusPane', () => {
    it('updates activeTabId and activePaneId together', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      const split = useBrowserStore.getState().tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      const rightLeafId = expectLeaf(split.right).id;

      store.focusPane(rightLeafId);

      const { activeTabId, activePaneId } = useBrowserStore.getState();
      expect(activeTabId).toBe(split.id);
      expect(activePaneId).toBe(rightLeafId);
    });

    it('is a no-op for an unknown pane id', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      const before = useBrowserStore.getState().activePaneId;

      store.focusPane('does-not-exist');

      expect(useBrowserStore.getState().activePaneId).toBe(before);
    });
  });

  describe('closeFocusedPane', () => {
    it('closes the whole tab when the focused pane is a top-level leaf', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');

      store.closeFocusedPane();

      expect(useBrowserStore.getState().tabs).toHaveLength(1);
      expect(expectLeaf(useBrowserStore.getState().tabs[0]).url).toBe('https://a.com');
    });

    it('flattens a split into the surviving leaf when one pane is closed', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      // Active pane is the left leaf (https://b.com after the swap).
      store.closeFocusedPane();

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      const leaf = expectLeaf(tabs[0]);
      // The surviving pane was the source (https://a.com)
      expect(leaf.url).toBe('https://a.com');
    });
  });

  describe('setSplitRatio', () => {
    it('clamps the ratio to [0.2, 0.8]', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);
      const splitId = useBrowserStore.getState().tabs[0].id;

      store.setSplitRatio(splitId, 0.05);
      const lower = useBrowserStore.getState().tabs[0];
      if (lower.kind !== 'split') throw new Error('expected split');
      expect(lower.ratio).toBe(0.2);

      store.setSplitRatio(splitId, 0.95);
      const upper = useBrowserStore.getState().tabs[0];
      if (upper.kind !== 'split') throw new Error('expected split');
      expect(upper.ratio).toBe(0.8);
    });
  });

  // ── Persistence ──────────────────────────────────────────────

  describe('persistTabs', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('preserves the split structure on disk', async () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      store.persistTabs();
      await vi.runAllTimersAsync();

      const persisted = electronStoreData.get('browser-tabs') as {
        tabs: Array<Record<string, unknown>>;
      };
      expect(persisted.tabs).toHaveLength(1);
      const split = persisted.tabs[0] as {
        kind: string;
        left: { url: string };
        right: { url: string };
      };
      expect(split.kind).toBe('split');
      expect(split.left.url).toBe('https://b.com');
      expect(split.right.url).toBe('https://a.com');
    });

    it('flags the focused pane as active on disk', async () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      // Focus the right (source) pane
      const split = useBrowserStore.getState().tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      store.focusPane(expectLeaf(split.right).id);

      store.persistTabs();
      await vi.runAllTimersAsync();

      const persisted = electronStoreData.get('browser-tabs') as {
        tabs: Array<{ right: { url: string; active?: boolean } }>;
      };
      expect(persisted.tabs[0].right.url).toBe('https://a.com');
      expect(persisted.tabs[0].right.active).toBe(true);
    });

    it('round-trips a split back through restoreTabs', async () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);

      store.persistTabs();
      await vi.runAllTimersAsync();

      useBrowserStore.setState({ tabs: [], activeTabId: null, activePaneId: null });
      await useBrowserStore.getState().restoreTabs();

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs).toHaveLength(1);
      const split = tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      expect(expectLeaf(split.left).url).toBe('https://b.com');
      expect(expectLeaf(split.right).url).toBe('https://a.com');
    });

    it('round-trips a flat tab list back through restoreTabs', async () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');

      store.persistTabs();
      await vi.runAllTimersAsync();

      // Wipe in-memory store and rehydrate from electronStore
      useBrowserStore.setState({ tabs: [], activeTabId: null, activePaneId: null });
      await useBrowserStore.getState().restoreTabs();

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs.map(t => expectLeaf(t).url)).toEqual(['https://a.com', 'https://b.com']);
    });

    it('drops malformed entries during restoreTabs without crashing', async () => {
      electronStoreData.set('browser-tabs', {
        tabs: [
          { url: 'https://valid.com', title: 'ok' },
          { url: '' },
          null,
          { title: 'no url' },
          { url: 'https://other.com', title: 'good' },
        ],
        activeIndex: 0,
      });

      await useBrowserStore.getState().restoreTabs();

      const tabs = useBrowserStore.getState().tabs;
      expect(tabs.map(t => expectLeaf(t).url)).toEqual(['https://valid.com', 'https://other.com']);
    });
  });
});
