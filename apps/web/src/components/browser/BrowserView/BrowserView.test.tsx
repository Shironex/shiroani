import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';

// Mock webview registry so the store doesn't try to call into a real webview
vi.mock('@/components/browser/webviewRefs', () => ({
  findPaneIdByWebContentsId: vi.fn(),
  getWebview: vi.fn(),
  registerWebview: vi.fn(),
  unregisterWebview: vi.fn(),
}));

// Mock platform — keep IS_ELECTRON false so anime presence side-effects no-op
vi.mock('@/lib/platform', () => ({
  IS_ELECTRON: false,
}));

// In-memory electron-store double — restoreTabs resolves to nothing
const electronStoreData = new Map<string, unknown>();
vi.mock('@/lib/electron-store', () => ({
  electronStoreGet: vi.fn(async (key: string) => electronStoreData.get(key)),
  electronStoreSet: vi.fn(async (key: string, value: unknown) => {
    electronStoreData.set(key, value);
  }),
  electronStoreDelete: vi.fn(async (key: string) => {
    electronStoreData.delete(key);
  }),
  createDebouncedPersist: () => () => {},
}));

// react-resizable-panels uses ResizeObserver and other DOM APIs that jsdom
// only partially supports; the simple stub keeps the panel group rendering.
vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

// Avoid pulling the AddToLibraryDialog network/store paths into this test
vi.mock('@/components/browser/AddToLibraryDialog', () => ({
  AddToLibraryDialog: () => null,
}));

let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `pane-${++uuidCounter}`,
});

import { useBrowserStore } from '@/stores/useBrowserStore';
import { useAppStore } from '@/stores/useAppStore';
import { findPaneIdByWebContentsId } from '@/components/browser/webviewRefs';
import { BrowserView } from '@/components/browser/BrowserView';

function getPaneWebview(paneId: string): HTMLElement {
  const container = document.querySelector<HTMLElement>(`[data-pane-id="${paneId}"]`);
  if (!container) throw new Error(`pane container for ${paneId} not found`);
  const webview = container.querySelector<HTMLElement>('webview');
  if (!webview) throw new Error(`webview for ${paneId} not found`);
  return webview;
}

function parentChain(el: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let cur: HTMLElement | null = el.parentElement;
  while (cur) {
    chain.push(cur);
    if (cur === document.body) break;
    cur = cur.parentElement;
  }
  return chain;
}

describe('BrowserView — webview DOM stability', () => {
  beforeEach(() => {
    uuidCounter = 0;
    electronStoreData.clear();
    useBrowserStore.setState({
      tabs: [],
      activeTabId: null,
      activePaneId: null,
      isAddressBarFocused: false,
      adblockEnabled: true,
      popupBlockEnabled: true,
      adblockWhitelist: [],
      restoreTabsOnStartup: false,
      splitTabsEnabled: true,
      isFullScreen: false,
    });
    useBrowserStore.getState().openTab('https://a.com');
    useBrowserStore.getState().openTab('https://b.com');
  });

  it('keeps each <webview> DOM node and parent chain stable across split, unsplit and closeFocusedPane', () => {
    render(<BrowserView />);

    const [tabA, tabB] = useBrowserStore.getState().tabs;
    const aId = tabA.id;
    const bId = tabB.id;

    const beforeWebviewA = getPaneWebview(aId);
    const beforeWebviewB = getPaneWebview(bId);
    const beforeChainA = parentChain(beforeWebviewA);
    const beforeChainB = parentChain(beforeWebviewB);

    const assertStable = (
      label: string,
      paneId: string,
      before: HTMLElement,
      beforeChain: HTMLElement[]
    ) => {
      const after = getPaneWebview(paneId);
      // Same DOM node — never recreated.
      expect(after, `${label}: ${paneId} webview node identity`).toBe(before);
      // Same parent — never reparented.
      expect(after.parentElement, `${label}: ${paneId} immediate parent`).toBe(
        before.parentElement
      );
      // Same full chain — Electron <webview> fires disconnectedCallback on
      // any ancestor change, so the entire chain to <body> must be unchanged.
      const afterChain = parentChain(after);
      expect(afterChain, `${label}: ${paneId} full parent chain`).toEqual(beforeChain);
    };

    // splitTabs — top-level shape collapses two leaf tabs into one split tab
    act(() => {
      useBrowserStore.getState().splitTabs(aId, bId);
    });
    assertStable('after splitTabs', aId, beforeWebviewA, beforeChainA);
    assertStable('after splitTabs', bId, beforeWebviewB, beforeChainB);

    // unsplitTab — split collapses back to two adjacent leaves
    const splitId = useBrowserStore.getState().tabs[0].id;
    act(() => {
      useBrowserStore.getState().unsplitTab(splitId);
    });
    assertStable('after unsplitTab', aId, beforeWebviewA, beforeChainA);
    assertStable('after unsplitTab', bId, beforeWebviewB, beforeChainB);

    // Re-split, then closeFocusedPane — the surviving pane keeps its DOM.
    act(() => {
      useBrowserStore.getState().splitTabs(aId, bId);
    });
    act(() => {
      useBrowserStore.getState().closeFocusedPane();
    });

    const survivorId = useBrowserStore.getState().activePaneId!;
    expect(survivorId === aId || survivorId === bId).toBe(true);
    const survivorBefore = survivorId === aId ? beforeWebviewA : beforeWebviewB;
    const survivorChain = survivorId === aId ? beforeChainA : beforeChainB;
    assertStable('after closeFocusedPane', survivorId, survivorBefore, survivorChain);
  });
});

type ShortcutPayload = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  webContentsId?: number;
};

describe('BrowserView: page zoom shortcuts', () => {
  let forwardShortcut: ((data: ShortcutPayload) => void) | null;

  beforeEach(() => {
    uuidCounter = 0;
    electronStoreData.clear();
    forwardShortcut = null;
    vi.mocked(findPaneIdByWebContentsId).mockReset();
    (window as unknown as { electronAPI?: unknown }).electronAPI = {
      browser: {
        onShortcut: (callback: (data: ShortcutPayload) => void) => {
          forwardShortcut = callback;
          return () => {
            forwardShortcut = null;
          };
        },
      },
    };
    useAppStore.setState({ activeView: 'browser' });
    useBrowserStore.setState({
      tabs: [],
      activeTabId: null,
      activePaneId: null,
      isAddressBarFocused: false,
      restoreTabsOnStartup: false,
      splitTabsEnabled: true,
      isFullScreen: false,
      zoomLevels: {},
    });
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    useAppStore.setState({ activeView: 'browser' });
  });

  const zoomLevels = () => ({ ...useBrowserStore.getState().zoomLevels });
  const pressZoomIn = (target: Window | Element = window) =>
    fireEvent.keyDown(target, { key: '=', ctrlKey: true });

  it('zooms the active page while the browser view is on screen', () => {
    useBrowserStore.getState().openTab('https://shinden.pl/');
    render(<BrowserView />);

    pressZoomIn();

    expect(zoomLevels()).toEqual({ 'shinden.pl': 110 });
  });

  it('ignores zoom keys while another view is active', () => {
    useBrowserStore.getState().openTab('https://shinden.pl/');
    render(<BrowserView />);

    for (const view of ['library', 'settings'] as const) {
      useAppStore.setState({ activeView: view });
      const event = pressZoomIn();
      expect(event, `${view}: default not prevented`).toBe(true);
      fireEvent.keyDown(window, { key: '0', ctrlKey: true });
      fireEvent.keyDown(window, { key: '-', metaKey: true });
    }

    expect(zoomLevels()).toEqual({});
  });

  it('zooms from the address bar, before the editable-target guard', () => {
    useBrowserStore.getState().openTab('https://shinden.pl/');
    render(<BrowserView />);
    const addressBar = screen.getByRole('combobox');
    addressBar.focus();

    pressZoomIn(addressBar);
    fireEvent.keyDown(addressBar, { key: '=', metaKey: true });

    expect(zoomLevels()).toEqual({ 'shinden.pl': 125 });
  });

  it('ignores zoom keys typed inside a dialog over the browser', () => {
    useBrowserStore.getState().openTab('https://shinden.pl/');
    render(<BrowserView />);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const field = document.createElement('input');
    dialog.appendChild(field);
    document.body.appendChild(dialog);

    try {
      const notPrevented = pressZoomIn(field);
      fireEvent.keyDown(dialog, { key: '-', ctrlKey: true });

      expect(notPrevented).toBe(true);
      expect(zoomLevels()).toEqual({});
    } finally {
      dialog.remove();
    }
  });

  it('routes a forwarded zoom to the guest that sent it, not the active pane', () => {
    useBrowserStore.getState().openTab('https://a.com/');
    useBrowserStore.getState().openTab('https://b.com/');
    const [tabA, tabB] = useBrowserStore.getState().tabs;
    useBrowserStore.getState().splitTabs(tabA.id, tabB.id);
    useBrowserStore.getState().focusPane(tabB.id);
    render(<BrowserView />);
    vi.mocked(findPaneIdByWebContentsId).mockImplementation(id => (id === 7 ? tabA.id : null));

    forwardShortcut?.({ key: '=', ctrl: true, webContentsId: 7 });

    expect(findPaneIdByWebContentsId).toHaveBeenCalledWith(7);
    expect(zoomLevels()).toEqual({ 'a.com': 110 });
  });

  it('drops a forwarded zoom from a guest that is no longer registered', () => {
    useBrowserStore.getState().openTab('https://a.com/');
    render(<BrowserView />);
    vi.mocked(findPaneIdByWebContentsId).mockReturnValue(null);

    forwardShortcut?.({ key: '=', ctrl: true, webContentsId: 99 });

    expect(forwardShortcut).not.toBeNull();
    expect(zoomLevels()).toEqual({});
  });

  it('a forwarded zoom without a sender zooms the active pane', () => {
    useBrowserStore.getState().openTab('https://a.com/');
    render(<BrowserView />);

    forwardShortcut?.({ key: '-', ctrl: true });

    expect(findPaneIdByWebContentsId).not.toHaveBeenCalled();
    expect(zoomLevels()).toEqual({ 'a.com': 90 });
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'renders and zooms a page on http://%s/ without crashing',
    host => {
      useBrowserStore.getState().openTab(`http://${host}/`);

      expect(() => render(<BrowserView />)).not.toThrow();
      expect(screen.queryByTestId('browser-zoom-indicator')).toBeNull();

      pressZoomIn();

      expect(screen.getByTestId('browser-zoom-indicator')).toHaveTextContent('110%');
    }
  );
});
