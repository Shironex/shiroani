import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedEvents } from '@shiroani/shared';

const { invokeBackend } = vi.hoisted(() => ({
  invokeBackend: vi.fn(),
}));

vi.mock('@/lib/backend', () => ({
  invokeBackend,
  onBackendEvent: vi.fn(() => () => {}),
}));

import { useFeedStore } from '../useFeedStore';

function resetFeedState() {
  useFeedStore.setState({
    items: [],
    sources: [],
    total: 0,
    hasMore: false,
    categoryFilter: 'all',
    languageFilter: 'all',
    sourceFilter: null,
    isLoading: false,
    isRefreshing: false,
    isBootstrapping: false,
    lastRefreshNewCount: null,
    error: null,
  });
}

describe('useFeedStore', () => {
  beforeEach(() => {
    resetFeedState();
    invokeBackend.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to a direct fetch when refresh completion is never broadcast', async () => {
    vi.useFakeTimers();

    invokeBackend.mockImplementation((event: string) => {
      if (event === FeedEvents.REFRESH) {
        return Promise.resolve({ started: true });
      }

      if (event === FeedEvents.GET_ITEMS) {
        return Promise.resolve({ items: [], total: 0, hasMore: false });
      }

      throw new Error(`Unexpected event: ${event}`);
    });

    useFeedStore.getState().refreshFeeds({ isBootstrap: true });
    await Promise.resolve();
    await Promise.resolve();

    expect(useFeedStore.getState().isRefreshing).toBe(true);
    expect(useFeedStore.getState().isBootstrapping).toBe(true);

    await vi.advanceTimersByTimeAsync(35_000);
    await Promise.resolve();
    await Promise.resolve();

    expect(useFeedStore.getState().isRefreshing).toBe(false);
    expect(useFeedStore.getState().isBootstrapping).toBe(false);
    expect(invokeBackend).toHaveBeenCalledWith(
      FeedEvents.GET_ITEMS,
      expect.objectContaining({
        category: 'all',
        language: 'all',
        limit: 30,
        offset: 0,
      })
    );
  });
});
