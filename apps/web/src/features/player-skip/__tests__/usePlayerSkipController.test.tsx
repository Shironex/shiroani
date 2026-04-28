import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AnimeEntry, BrowserNode, BrowserLeafNode } from '@shiroani/shared';

// ── Module mocks ──────────────────────────────────────────────────────

vi.mock('@/components/browser/webviewRefs', () => ({
  getWebview: vi.fn(),
}));

vi.mock('../resolveMalId', () => ({
  resolveMalId: vi.fn(),
}));

vi.mock('@/lib/anime-detection', () => ({
  detectAnimeFromUrl: vi.fn(),
}));

vi.mock('../episode-from-url', () => ({
  extractEpisodeNumber: vi.fn(),
}));

import { getWebview } from '@/components/browser/webviewRefs';
import { detectAnimeFromUrl } from '@/lib/anime-detection';
import { extractEpisodeNumber } from '../episode-from-url';
import { resolveMalId } from '../resolveMalId';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { usePlayerSkipController } from '../usePlayerSkipController';

const mockGetWebview = getWebview as ReturnType<typeof vi.fn>;
const mockDetect = detectAnimeFromUrl as ReturnType<typeof vi.fn>;
const mockExtractEp = extractEpisodeNumber as ReturnType<typeof vi.fn>;
const mockResolveMalId = resolveMalId as ReturnType<typeof vi.fn>;

// ── electronAPI fixtures ──────────────────────────────────────────────

const attachController = vi.fn(async () => ({ ok: true, mode: 'fallback' as const }));
const detachController = vi.fn(async () => ({ ok: true }));
const updateController = vi.fn(async () => ({ ok: true, mode: 'aniskip' as const }));

beforeEach(() => {
  // Reset store state.
  useBrowserStore.setState({ tabs: [], activeTabId: null, activePaneId: null });
  useSettingsStore.setState({ opEdSkipEnabled: true, autoSkipEnabled: false });
  useLibraryStore.setState({ entries: [] });

  attachController.mockClear();
  detachController.mockClear();
  updateController.mockClear();

  attachController.mockResolvedValue({ ok: true, mode: 'fallback' as const });
  detachController.mockResolvedValue({ ok: true });
  updateController.mockResolvedValue({ ok: true, mode: 'aniskip' as const });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = (globalThis as any).window ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electronAPI = {
    playerSkip: {
      attachController,
      detachController,
      updateController,
    },
  };

  mockGetWebview.mockReset();
  mockDetect.mockReset();
  mockExtractEp.mockReset();
  mockResolveMalId.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Helpers ───────────────────────────────────────────────────────────

function setActivePane(paneId: string, url: string, title: string): void {
  const leaf: BrowserLeafNode = {
    kind: 'leaf',
    id: paneId,
    url,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
  };
  const tabs: BrowserNode[] = [leaf];
  useBrowserStore.setState({ tabs, activeTabId: paneId, activePaneId: paneId });
}

function makeWebview(webContentsId: number) {
  return {
    getWebContentsId: () => webContentsId,
  };
}

function flushAsync(): Promise<void> {
  // Allow any pending microtask + macrotask queues to run. The hook uses
  // promise chains spawned inside effects; multiple awaits cover them.
  return new Promise(resolve => setTimeout(resolve, 0));
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePlayerSkipController', () => {
  describe('master toggle off', () => {
    it('does not attach when opEdSkipEnabled is false', async () => {
      useSettingsStore.setState({ opEdSkipEnabled: false });
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');
      mockGetWebview.mockReturnValue(makeWebview(42));

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      expect(attachController).not.toHaveBeenCalled();
    });

    it('detaches when toggle flips off after attach', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockResolvedValue(null);

      const { rerender } = renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();
      expect(attachController).toHaveBeenCalledTimes(1);

      // Flip the toggle off.
      await act(async () => {
        useSettingsStore.setState({ opEdSkipEnabled: false });
      });
      rerender();
      await flushAsync();

      expect(detachController).toHaveBeenCalledWith({ webContentsId: 42 });
    });
  });

  describe('non-anime URL', () => {
    it('does not attach', async () => {
      setActivePane('p1', 'https://example.com', 'Some site');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue(null);

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      expect(attachController).not.toHaveBeenCalled();
    });
  });

  describe('attach on recognized anime URL', () => {
    it('sends provisional attach with malId=null then upgrades via updateController', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate Odcinek 1');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockResolvedValue({
        malId: 9253,
        anilistId: 9253,
        source: 'library-direct',
        confidence: 1.0,
      });

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      // First call: provisional attach with malId=null (so user sees fallback button immediately).
      expect(attachController).toHaveBeenCalledWith({
        webContentsId: 42,
        malId: null,
        episode: 1,
        autoSkipEnabled: false,
      });

      // Second call: update with the resolved malId.
      expect(updateController).toHaveBeenCalledWith({
        webContentsId: 42,
        partial: { malId: 9253, episode: 1, autoSkipEnabled: false },
      });
    });

    it('passes episode=null when extractEpisodeNumber returns null', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/player/123', 'Steins;Gate');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(null);
      mockResolveMalId.mockResolvedValue(null);

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      expect(attachController).toHaveBeenCalledWith({
        webContentsId: 42,
        malId: null,
        episode: null,
        autoSkipEnabled: false,
      });
    });

    it('keeps fallback when resolveMalId returns null', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/obscure-show/1', 'Obscure');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Obscure Show' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockResolvedValue(null);

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      expect(attachController).toHaveBeenCalledTimes(1);
      // No updateController call — fallback stands.
      expect(updateController).not.toHaveBeenCalled();
    });
  });

  describe('library persist (Tier 2)', () => {
    it('passes updateEntry as onAnilistIdResolved to resolveMalId', async () => {
      const updateEntry = vi.fn();
      const entry: AnimeEntry = {
        id: 7,
        title: 'Steins;Gate',
        status: 'watching',
        currentEpisode: 0,
        addedAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      useLibraryStore.setState({ entries: [entry] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useLibraryStore as any).setState({ updateEntry });

      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockImplementation(async args => {
        // Simulate Tier-2 persist: invoke the callback.
        args.onAnilistIdResolved?.(7, 9253);
        return {
          malId: 9253,
          anilistId: 9253,
          source: 'library-resolved' as const,
          confidence: 0.95,
        };
      });

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();

      expect(updateEntry).toHaveBeenCalledWith({ id: 7, anilistId: 9253 });
    });
  });

  describe('race-condition guard', () => {
    it('drops resolveMalId result when URL changes mid-resolution', async () => {
      const resolverRef: { resolve: ((value: unknown) => void) | null } = { resolve: null };
      mockResolveMalId.mockImplementation(
        () =>
          new Promise(resolve => {
            resolverRef.resolve = resolve;
          })
      );

      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockGetWebview.mockReturnValue(makeWebview(42));
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');

      const { rerender } = renderHook(() => usePlayerSkipController('p1'));
      // Provisional attach went out.
      await flushAsync();
      expect(attachController).toHaveBeenCalledTimes(1);

      // User navigates away mid-resolution.
      mockDetect.mockReturnValue(null);
      await act(async () => {
        setActivePane('p1', 'https://example.com', 'Other site');
      });
      rerender();
      await flushAsync();

      // Detach was issued because URL became non-anime.
      expect(detachController).toHaveBeenCalled();

      // Now the slow resolveMalId resolves with stale data.
      resolverRef.resolve?.({
        malId: 9253,
        anilistId: 9253,
        source: 'library-direct' as const,
        confidence: 1.0,
      });
      await flushAsync();

      // updateController should NOT have been called with the stale result.
      expect(updateController).not.toHaveBeenCalled();
    });
  });

  describe('in-place update on episode change (same wc)', () => {
    it('uses updateController instead of detach+attach when only episode changes', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate Odcinek 1');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockResolvedValue(null);

      const { rerender } = renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();
      expect(attachController).toHaveBeenCalledTimes(1);

      // Navigate to episode 2 — same webview, same anime.
      mockExtractEp.mockReturnValue(2);
      await act(async () => {
        setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/2', 'Steins;Gate Odcinek 2');
      });
      rerender();
      await flushAsync();

      // Should NOT have detached — just updated in place.
      expect(detachController).not.toHaveBeenCalled();
      expect(updateController).toHaveBeenCalledWith({
        webContentsId: 42,
        partial: { malId: null, episode: 2, autoSkipEnabled: false },
      });
    });
  });

  describe('unmount cleanup', () => {
    it('detaches on unmount', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');
      mockGetWebview.mockReturnValue(makeWebview(42));
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);
      mockResolveMalId.mockResolvedValue(null);

      const { unmount } = renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();
      expect(attachController).toHaveBeenCalled();

      unmount();
      expect(detachController).toHaveBeenCalledWith({ webContentsId: 42 });
    });
  });

  describe('webview not yet ready', () => {
    it('bails without attaching when getWebview returns undefined', async () => {
      setActivePane('p1', 'https://ogladajanime.pl/anime/steins-gate/1', 'Steins;Gate');
      mockGetWebview.mockReturnValue(undefined);
      mockDetect.mockReturnValue({ animeTitle: 'Steins Gate' });
      mockExtractEp.mockReturnValue(1);

      renderHook(() => usePlayerSkipController('p1'));
      await flushAsync();
      expect(attachController).not.toHaveBeenCalled();
    });
  });
});
