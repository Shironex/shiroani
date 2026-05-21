export type FeedViewState = 'loading' | 'error' | 'empty' | 'content';

export function getFeedViewState({
  itemsCount,
  isLoading,
  isRefreshing,
  isBootstrapping,
  error,
}: {
  itemsCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isBootstrapping: boolean;
  error: string | null;
}): FeedViewState {
  if (itemsCount === 0 && (isLoading || isRefreshing || isBootstrapping)) {
    return 'loading';
  }

  if (error && itemsCount === 0) {
    return 'error';
  }

  if (itemsCount === 0) {
    return 'empty';
  }

  return 'content';
}
