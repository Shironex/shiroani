import { useCallback, useMemo } from 'react';
import { useDiscoverStore } from '@/stores/useDiscoverStore';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import { useRandomCarousel } from '../random/useRandomCarousel';
import { buildShowcaseMeta } from '../random/random-utils';
import type {
  IRandomDiscoveryPanelProps,
  IRandomDiscoveryPanelView,
} from './RandomDiscoveryPanel.types';

export function useRandomDiscoveryPanel({
  excludedIds,
}: Pick<IRandomDiscoveryPanelProps, 'excludedIds'>): IRandomDiscoveryPanelView {
  const shuffled = useDiscoverStore(s => s.randomShuffled);
  const pool = useMemo(
    () => (excludedIds.size === 0 ? shuffled : shuffled.filter(m => !excludedIds.has(m.id))),
    [shuffled, excludedIds]
  );
  const included = useDiscoverStore(s => s.randomIncludedGenres);
  const excluded = useDiscoverStore(s => s.randomExcludedGenres);
  const isLoading = useDiscoverStore(s => s.isRandomLoading);
  const error = useDiscoverStore(s => s.error);

  const { index, current, peekPrev, peekNext, prev, next } = useRandomCarousel(pool);

  const handleRefetch = useCallback(() => {
    useDiscoverStore.getState().fetchRandomPool();
  }, []);

  const handleGenresChange = useCallback((inc: string[], exc: string[]) => {
    useDiscoverStore.getState().setRandomGenres(inc, exc);
  }, []);

  const handleAddToLibrary = useAddDiscoverMediaToLibrary();

  const banner = current ? buildShowcaseMeta(current).banner : undefined;
  const showSkeleton = isLoading && pool.length === 0;
  const isEmpty = pool.length === 0;
  const showPeekFooter = Boolean(peekPrev) || Boolean(peekNext);

  return {
    pool,
    included,
    excluded,
    isLoading,
    error,
    index,
    current,
    peekPrev,
    peekNext,
    prev,
    next,
    banner,
    showSkeleton,
    isEmpty,
    showPeekFooter,
    handleRefetch,
    handleGenresChange,
    handleAddToLibrary,
  };
}
