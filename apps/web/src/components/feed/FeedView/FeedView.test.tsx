import { describe, expect, it } from 'vitest';
import { getFeedViewState } from '../feed-view-state';

describe('getFeedViewState', () => {
  it('returns loading while the first feed bootstrap refresh is in progress', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: false,
        isRefreshing: true,
        isBootstrapping: true,
        error: null,
      })
    ).toBe('loading');
  });

  it('returns empty after loading settles with no feed items', () => {
    expect(
      getFeedViewState({
        itemsCount: 0,
        isLoading: false,
        isRefreshing: false,
        isBootstrapping: false,
        error: null,
      })
    ).toBe('empty');
  });
});
