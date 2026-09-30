import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';
import { syncPaneWebview, useBrowserStore } from '../useBrowserStore';
import { getWebview } from '@/components/browser/webviewRefs';
import i18n from '@/lib/i18n';

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
      favorites: [],
      favoritesBarVisible: true,
      zoomLevels: {},
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
      expect(leaf.title).toBe(i18n.t('browser:tabs.newTab'));
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

      expect(expectLeaf(useBrowserStore.getState().tabs[1]).title).toBe(
        i18n.t('browser:tabs.newTab')
      );
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

  // ── Favorites ────────────────────────────────────────────────

  describe('favorites', () => {
    it('addFavorite appends a favorite with url/title/favicon', () => {
      useBrowserStore.getState().addFavorite('https://a.com', 'Site A', 'https://a.com/fav.ico');

      const { favorites } = useBrowserStore.getState();
      expect(favorites).toHaveLength(1);
      expect(favorites[0]).toMatchObject({
        url: 'https://a.com',
        title: 'Site A',
        favicon: 'https://a.com/fav.ico',
      });
      expect(typeof favorites[0].id).toBe('string');
      expect(typeof favorites[0].createdAt).toBe('number');
    });

    it('addFavorite falls back to the url when the title is empty', () => {
      useBrowserStore.getState().addFavorite('https://a.com', '');
      expect(useBrowserStore.getState().favorites[0].title).toBe('https://a.com');
    });

    it('addFavorite dedupes by exact URL', () => {
      useBrowserStore.getState().addFavorite('https://a.com', 'A');
      useBrowserStore.getState().addFavorite('https://a.com', 'A again');
      expect(useBrowserStore.getState().favorites).toHaveLength(1);
    });

    it('addFavorite ignores internal surfaces (new tab / about:blank / empty)', () => {
      useBrowserStore.getState().addFavorite('shiroani://newtab', 'New tab');
      useBrowserStore.getState().addFavorite('about:blank', 'Blank');
      useBrowserStore.getState().addFavorite('', 'Empty');
      expect(useBrowserStore.getState().favorites).toHaveLength(0);
    });

    it('toggleFavorite adds when absent and removes when present', () => {
      const store = useBrowserStore.getState();
      store.toggleFavorite('https://a.com', 'A');
      expect(useBrowserStore.getState().favorites).toHaveLength(1);

      store.toggleFavorite('https://a.com', 'A');
      expect(useBrowserStore.getState().favorites).toHaveLength(0);
    });

    it('removeFavorite removes by id only', () => {
      const store = useBrowserStore.getState();
      store.addFavorite('https://a.com', 'A');
      store.addFavorite('https://b.com', 'B');
      const idA = useBrowserStore.getState().favorites[0].id;

      store.removeFavorite(idA);

      const { favorites } = useBrowserStore.getState();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].url).toBe('https://b.com');
    });

    it('renameFavorite updates the title and trims whitespace', () => {
      const store = useBrowserStore.getState();
      store.addFavorite('https://a.com', 'A');
      const id = useBrowserStore.getState().favorites[0].id;

      store.renameFavorite(id, '  Renamed  ');
      expect(useBrowserStore.getState().favorites[0].title).toBe('Renamed');
    });

    it('renameFavorite is a no-op for blank titles', () => {
      const store = useBrowserStore.getState();
      store.addFavorite('https://a.com', 'A');
      const id = useBrowserStore.getState().favorites[0].id;

      store.renameFavorite(id, '   ');
      expect(useBrowserStore.getState().favorites[0].title).toBe('A');
    });

    it('reorderFavorites moves a favorite from one index to another', () => {
      const store = useBrowserStore.getState();
      store.addFavorite('https://a.com', 'A');
      store.addFavorite('https://b.com', 'B');
      store.addFavorite('https://c.com', 'C');
      const [a, , c] = useBrowserStore.getState().favorites.map(f => f.id);

      store.reorderFavorites(a, c); // move A to where C is

      expect(useBrowserStore.getState().favorites.map(f => f.url)).toEqual([
        'https://b.com',
        'https://c.com',
        'https://a.com',
      ]);
    });

    it('reorderFavorites is a no-op for unknown ids', () => {
      const store = useBrowserStore.getState();
      store.addFavorite('https://a.com', 'A');
      store.addFavorite('https://b.com', 'B');

      store.reorderFavorites('nope', 'also-nope');
      expect(useBrowserStore.getState().favorites.map(f => f.url)).toEqual([
        'https://a.com',
        'https://b.com',
      ]);
    });

    it('caps favorites at the max-entries bound', () => {
      const store = useBrowserStore.getState();
      for (let i = 0; i < 105; i++) {
        store.addFavorite(`https://site-${i}.com`, `Site ${i}`);
      }
      expect(useBrowserStore.getState().favorites).toHaveLength(100);
    });

    describe('persistence', () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      it('round-trips favorites through restoreTabs', async () => {
        const store = useBrowserStore.getState();
        store.addFavorite('https://a.com', 'A', 'https://a.com/f.ico');
        store.addFavorite('https://b.com', 'B');
        await vi.runAllTimersAsync();

        useBrowserStore.setState({ favorites: [] });
        await useBrowserStore.getState().restoreTabs();

        const { favorites } = useBrowserStore.getState();
        expect(favorites.map(f => f.url)).toEqual(['https://a.com', 'https://b.com']);
        expect(favorites[0].favicon).toBe('https://a.com/f.ico');
      });

      it('setFavoritesBarVisible persists into browser-settings', async () => {
        await useBrowserStore.getState().setFavoritesBarVisible(false);
        expect(useBrowserStore.getState().favoritesBarVisible).toBe(false);
        const settings = electronStoreData.get('browser-settings') as {
          favoritesBarVisible?: boolean;
        };
        expect(settings.favoritesBarVisible).toBe(false);
      });
    });
  });
  // ── Tab audio (mute) ──────────────────────────────────────────

  describe('tab audio', () => {
    /** Fake webviews keyed by pane id, served through the mocked getWebview. */
    const webviews = new Map<string, { setAudioMuted: ReturnType<typeof vi.fn> }>();

    beforeEach(() => {
      webviews.clear();
      vi.mocked(getWebview).mockImplementation(
        paneId => webviews.get(paneId) as unknown as ReturnType<typeof getWebview> | undefined
      );
    });

    afterEach(() => {
      vi.mocked(getWebview).mockReset();
    });

    function fakeWebview(paneId: string) {
      const el = { setAudioMuted: vi.fn() };
      webviews.set(paneId, el);
      return el;
    }

    /** Open two tabs and split them into one; returns the split tab and its pane ids. */
    function openSplitTab() {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      store.splitTabs(aId, bId);
      const split = useBrowserStore.getState().tabs[0];
      return { splitId: split.id, aId, bId };
    }

    it('mutes a single-pane tab and its webview', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;
      const el = fakeWebview(tabId);

      useBrowserStore.getState().toggleTabMuted(tabId);

      expect(expectLeaf(useBrowserStore.getState().tabs[0]).isMuted).toBe(true);
      expect(el.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('unmutes a muted tab on the second toggle', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;
      const el = fakeWebview(tabId);

      useBrowserStore.getState().toggleTabMuted(tabId);
      useBrowserStore.getState().toggleTabMuted(tabId);

      expect(expectLeaf(useBrowserStore.getState().tabs[0]).isMuted).toBe(false);
      expect(el.setAudioMuted).toHaveBeenLastCalledWith(false);
    });

    it('mutes every pane of a split tab', () => {
      const { splitId, aId, bId } = openSplitTab();
      const a = fakeWebview(aId);
      const b = fakeWebview(bId);

      useBrowserStore.getState().toggleTabMuted(splitId);

      const split = useBrowserStore.getState().tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      expect(expectLeaf(split.left).isMuted).toBe(true);
      expect(expectLeaf(split.right).isMuted).toBe(true);
      expect(a.setAudioMuted).toHaveBeenCalledWith(true);
      expect(b.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('leaves other tabs alone', () => {
      const store = useBrowserStore.getState();
      store.openTab('https://a.com');
      store.openTab('https://b.com');
      const [aId, bId] = useBrowserStore.getState().tabs.map(t => t.id);
      const b = fakeWebview(bId);

      store.toggleTabMuted(aId);

      expect(expectLeaf(useBrowserStore.getState().tabs[1]).isMuted).toBeFalsy();
      expect(b.setAudioMuted).not.toHaveBeenCalled();
    });

    it('survives a webview that is not attached yet', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;
      webviews.set(tabId, {
        setAudioMuted: vi.fn(() => {
          throw new Error('The WebView must be attached to the DOM');
        }),
      });

      expect(() => useBrowserStore.getState().toggleTabMuted(tabId)).not.toThrow();
      expect(expectLeaf(useBrowserStore.getState().tabs[0]).isMuted).toBe(true);
    });

    it('records per-pane audibility and ignores repeats', () => {
      useBrowserStore.getState().openTab('https://a.com');
      const tabId = useBrowserStore.getState().tabs[0].id;

      useBrowserStore.getState().setPaneAudible(tabId, true);
      const afterFirst = useBrowserStore.getState().tabs;
      expect(expectLeaf(afterFirst[0]).isAudible).toBe(true);

      useBrowserStore.getState().setPaneAudible(tabId, true);
      expect(useBrowserStore.getState().tabs).toBe(afterFirst);

      useBrowserStore.getState().setPaneAudible('missing-pane', true);
      expect(useBrowserStore.getState().tabs).toBe(afterFirst);
    });

    it('mutes an audible split tab where one pane was already muted', () => {
      const { splitId, aId, bId } = openSplitTab();
      useBrowserStore.getState().setPaneAudible(aId, true);
      // Mute only b by hand: the tab is still audible because of a.
      useBrowserStore.getState().updateTabState(bId, { isMuted: true });

      useBrowserStore.getState().toggleTabMuted(splitId);

      const split = useBrowserStore.getState().tabs[0];
      if (split.kind !== 'split') throw new Error('expected split');
      expect(expectLeaf(split.left).isMuted).toBe(true);
      expect(expectLeaf(split.right).isMuted).toBe(true);
    });

    it('keeps mute out of the persisted session', async () => {
      vi.useFakeTimers();
      try {
        useBrowserStore.getState().openTab('https://a.com');
        const tabId = useBrowserStore.getState().tabs[0].id;
        useBrowserStore.getState().toggleTabMuted(tabId);
        useBrowserStore.getState().persistTabs();
        await vi.runAllTimersAsync();

        const persisted = electronStoreData.get('browser-tabs') as {
          tabs: Array<Record<string, unknown>>;
        };
        expect(persisted.tabs[0]).not.toHaveProperty('isMuted');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // ── Per-site zoom ─────────────────────────────────────────────

  describe('site zoom', () => {
    type FakeZoomWebview = {
      setZoomFactor: ReturnType<typeof vi.fn>;
      setAudioMuted: ReturnType<typeof vi.fn>;
      getURL: () => string;
    };
    const webviews = new Map<string, FakeZoomWebview>();

    beforeEach(() => {
      vi.useFakeTimers();
      webviews.clear();
      vi.mocked(getWebview).mockImplementation(
        paneId => webviews.get(paneId) as unknown as ReturnType<typeof getWebview> | undefined
      );
    });

    afterEach(() => {
      vi.mocked(getWebview).mockReset();
      vi.useRealTimers();
    });

    /** Open a tab on `url` with a fake webview; returns the pane id and the webview. */
    function openSite(url: string) {
      useBrowserStore.getState().openTab(url);
      const { tabs } = useBrowserStore.getState();
      const paneId = tabs[tabs.length - 1].id;
      const el: FakeZoomWebview = {
        setZoomFactor: vi.fn(),
        setAudioMuted: vi.fn(),
        getURL: () => url,
      };
      webviews.set(paneId, el);
      return { paneId, el };
    }

    it('steps the active site zoom and remembers it by hostname', () => {
      openSite('https://shinden.pl/anime/1');
      const store = useBrowserStore.getState();

      store.zoomActivePane('in');
      store.zoomActivePane('in');

      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'shinden.pl': 125 });
    });

    it('applies the level to every pane on the same site and no other', () => {
      const first = openSite('https://shinden.pl/a');
      const other = openSite('https://youtube.com/');
      const second = openSite('https://shinden.pl/b');

      useBrowserStore.getState().setSiteZoom('shinden.pl', 150);

      expect(first.el.setZoomFactor).toHaveBeenCalledWith(1.5);
      expect(second.el.setZoomFactor).toHaveBeenCalledWith(1.5);
      expect(other.el.setZoomFactor).not.toHaveBeenCalled();
    });

    it('zooms out and resets, dropping the host once it is back at 100%', () => {
      const { el } = openSite('https://shinden.pl/');
      const store = useBrowserStore.getState();

      store.zoomActivePane('out');
      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'shinden.pl': 90 });
      expect(el.setZoomFactor).toHaveBeenLastCalledWith(0.9);

      store.zoomActivePane('reset');
      expect(useBrowserStore.getState().zoomLevels).toEqual({});
      expect(el.setZoomFactor).toHaveBeenLastCalledWith(1);
    });

    it('does nothing on a page without a site (new tab)', () => {
      useBrowserStore.getState().openTab();
      useBrowserStore.getState().zoomActivePane('in');
      expect(useBrowserStore.getState().zoomLevels).toEqual({});
    });

    it('persists the zoom map (debounced) and restores it', async () => {
      openSite('https://shinden.pl/');
      const store = useBrowserStore.getState();
      store.zoomActivePane('in');
      store.zoomActivePane('in');
      await vi.runAllTimersAsync();

      expect(electronStoreData.get('browser-zoom-levels')).toEqual({ 'shinden.pl': 125 });

      useBrowserStore.setState({ zoomLevels: {} });
      await useBrowserStore.getState().restoreTabs();
      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'shinden.pl': 125 });
    });

    it('restores the zoom map even when session restore is off', async () => {
      electronStoreData.set('browser-zoom-levels', { 'a.com': 80, 'bad.com': 'x' });
      useBrowserStore.setState({ restoreTabsOnStartup: false });

      await useBrowserStore.getState().restoreTabs();

      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'a.com': 80 });
    });

    it('syncPaneWebview re-applies the site zoom and the pane mute flag', () => {
      const { paneId, el } = openSite('https://shinden.pl/');
      useBrowserStore.setState({ zoomLevels: { 'shinden.pl': 175 } });
      useBrowserStore.getState().updateTabState(paneId, { isMuted: true });

      syncPaneWebview(paneId);

      expect(el.setZoomFactor).toHaveBeenCalledWith(1.75);
      expect(el.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('syncPaneWebview resets a pane that moved to a site without a level', () => {
      const { paneId, el } = openSite('https://youtube.com/');
      useBrowserStore.setState({ zoomLevels: { 'shinden.pl': 175 } });

      syncPaneWebview(paneId);

      expect(el.setZoomFactor).toHaveBeenCalledWith(1);
      expect(el.setAudioMuted).toHaveBeenCalledWith(false);
    });

    it('zoomPane zooms the named pane even when another pane is active', () => {
      const target = openSite('https://shinden.pl/');
      const active = openSite('https://youtube.com/');
      expect(useBrowserStore.getState().activePaneId).toBe(active.paneId);

      useBrowserStore.getState().zoomPane(target.paneId, 'in');

      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'shinden.pl': 110 });
      expect(target.el.setZoomFactor).toHaveBeenCalledWith(1.1);
      expect(active.el.setZoomFactor).not.toHaveBeenCalled();
    });

    it('zoomPane ignores an unknown pane', () => {
      openSite('https://shinden.pl/');
      useBrowserStore.getState().zoomPane('no-such-pane', 'in');
      expect(useBrowserStore.getState().zoomLevels).toEqual({});
    });

    it('keeps going when a webview throws from setZoomFactor', async () => {
      const broken = openSite('https://shinden.pl/a');
      const healthy = openSite('https://shinden.pl/b');
      broken.el.setZoomFactor.mockImplementation(() => {
        throw new Error('The WebView must be attached to the DOM');
      });

      expect(() => useBrowserStore.getState().setSiteZoom('shinden.pl', 150)).not.toThrow();
      expect(() => syncPaneWebview(broken.paneId)).not.toThrow();

      expect(useBrowserStore.getState().zoomLevels).toEqual({ 'shinden.pl': 150 });
      expect(healthy.el.setZoomFactor).toHaveBeenCalledWith(1.5);
      await vi.runAllTimersAsync();
      expect(electronStoreData.get('browser-zoom-levels')).toEqual({ 'shinden.pl': 150 });
    });

    it('never hands a webview NaN or an out-of-range factor', () => {
      const { paneId, el } = openSite('https://shinden.pl/');
      useBrowserStore.setState({ zoomLevels: { 'shinden.pl': Number.NaN } });
      syncPaneWebview(paneId);
      useBrowserStore.setState({ zoomLevels: { 'shinden.pl': 9000 } });
      syncPaneWebview(paneId);

      for (const [factor] of el.setZoomFactor.mock.calls) {
        expect(factor).toBe(1);
      }
      expect(el.setZoomFactor).toHaveBeenCalledTimes(2);
    });

    describe('prototype-named hosts from web content', () => {
      it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
        'http://%s/ starts at 100%%, zooms one step and persists safely',
        async host => {
          const { paneId, el } = openSite(`http://${host}/`);
          const key = host.toLowerCase();

          syncPaneWebview(paneId);
          expect(el.setZoomFactor).toHaveBeenLastCalledWith(1);

          useBrowserStore.getState().zoomActivePane('in');
          expect(el.setZoomFactor).toHaveBeenLastCalledWith(1.1);
          const levels = useBrowserStore.getState().zoomLevels;
          expect(Object.keys(levels)).toEqual([key]);
          expect(Object.hasOwn(levels, key)).toBe(true);

          await vi.runAllTimersAsync();
          const persisted = JSON.stringify(electronStoreData.get('browser-zoom-levels'));
          expect(persisted).toBe(`{"${key}":110}`);

          // Restore from what a JSON store hands back.
          electronStoreData.set('browser-zoom-levels', JSON.parse(persisted));
          useBrowserStore.setState({ zoomLevels: {} });
          await useBrowserStore.getState().restoreTabs();
          el.setZoomFactor.mockClear();
          syncPaneWebview(paneId);
          expect(el.setZoomFactor).toHaveBeenCalledWith(1.1);
        }
      );

      it('an ordinary site is unaffected by a zoomed __proto__ host', () => {
        openSite('http://__proto__/');
        useBrowserStore.getState().zoomActivePane('in');
        const { paneId, el } = openSite('https://shinden.pl/');

        syncPaneWebview(paneId);

        expect(el.setZoomFactor).toHaveBeenCalledWith(1);
      });
    });
  });
});
