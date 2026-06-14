import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import type { AiringAnime, AnimeStatus, DiscoverSort, DiscoverFilters } from '@shiroani/shared';
import type { DiscoverTab, IDiscoverViewView } from './DiscoverView.types';

/**
 * Library statuses that count as "already handled" for the exclude toggle
 * (item 14): watched, dropped, planned. On-hold and currently-watching stay
 * visible so users can still rediscover what they're mid-way through.
 */
const EXCLUDED_LIBRARY_STATUSES: ReadonlySet<AnimeStatus> = new Set<AnimeStatus>([
  'completed',
  'dropped',
  'plan_to_watch',
]);

/** Set of anilistIds present in the user's library */
function useLibraryAnilistIds(): Set<number> {
  const entries = useLibraryStore(s => s.entries);
  return useMemo(
    () => new Set(entries.map(e => e.anilistId).filter(Boolean) as number[]),
    [entries]
  );
}

/**
 * anilistIds the exclude toggle should hide — entries marked watched, dropped
 * or planned (item 14). Empty set when the toggle is off, so the filter is a
 * no-op until opted in.
 */
function useExcludedLibraryIds(active: boolean): Set<number> {
  const entries = useLibraryStore(s => s.entries);
  return useMemo(() => {
    if (!active) return new Set<number>();
    const ids = entries
      .filter(e => EXCLUDED_LIBRARY_STATUSES.has(e.status) && e.anilistId)
      .map(e => e.anilistId as number);
    return new Set(ids);
  }, [active, entries]);
}

export function useDiscoverView(): IDiscoverViewView {
  const { t } = useTranslation('discover');
  const tabs = useMemo<IDiscoverViewView['tabs']>(
    () => [
      { value: 'trending', label: t('tabs.trending') },
      { value: 'popular', label: t('tabs.popular') },
      { value: 'seasonal', label: t('tabs.seasonal') },
      { value: 'random', label: t('tabs.random') },
      { value: 'recommendations', label: t('tabs.recommendations') },
    ],
    [t]
  );
  const activeTab = useDiscoverStore(s => s.activeTab);
  const searchQuery = useDiscoverStore(s => s.searchQuery);
  const isLoading = useDiscoverStore(s => s.isLoading);
  const isSearching = useDiscoverStore(s => s.isSearching);
  const error = useDiscoverStore(s => s.error);

  const trending = useDiscoverStore(s => s.trending);
  const popular = useDiscoverStore(s => s.popular);
  const seasonal = useDiscoverStore(s => s.seasonal);
  const searchResults = useDiscoverStore(s => s.searchResults);

  const trendingPage = useDiscoverStore(s => s.trendingPage);
  const popularPage = useDiscoverStore(s => s.popularPage);
  const seasonalPage = useDiscoverStore(s => s.seasonalPage);
  const searchPage = useDiscoverStore(s => s.searchPage);

  const sort = useDiscoverStore(s => s.sort);
  const filters = useDiscoverStore(s => s.filters);
  const excludeLibrary = useDiscoverStore(s => s.excludeLibrary);

  const connected = useAniListAuthStore(s => s.status.connected);

  const libraryIds = useLibraryAnilistIds();
  const excludedIds = useExcludedLibraryIds(excludeLibrary);

  const [selectedAnime, setSelectedAnime] = useState<AiringAnime | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = useCallback((media: DiscoverMedia) => {
    // Map DiscoverMedia to a minimal AiringAnime shape for the dialog
    const asAiring: AiringAnime = {
      id: media.id,
      airingAt: media.nextAiringEpisode?.airingAt ?? 0,
      episode: media.nextAiringEpisode?.episode ?? 0,
      media: {
        id: media.id,
        title: media.title,
        coverImage: media.coverImage,
        episodes: media.episodes,
        status: media.status ?? 'UNKNOWN',
        genres: media.genres ?? [],
        format: media.format,
        averageScore: media.averageScore,
        popularity: media.popularity,
      },
    };
    setSelectedAnime(asAiring);
    setDialogOpen(true);
  }, []);

  const handleAddToLibrary = useAddDiscoverMediaToLibrary();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialFetchDone = useRef(false);

  // Fetch trending on mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    const { fetchTrending, trending } = useDiscoverStore.getState();
    if (trending.length === 0) fetchTrending();
  }, []);

  // Hydrate AniList connection status on mount — the auth store `status` is not
  // persisted, so a fresh Discover mount sees a stale `connected=false`, which
  // would silently disable write-through add (C3), the "haven't seen" toggle
  // (C4) and the recommendation vote buttons (C5) for a connected viewer.
  useEffect(() => {
    void useAniListAuthStore.getState().fetchStatus();
  }, []);

  // Handle tab change. `setTab` already performs the fetch-if-empty for every
  // tab (single source of truth) — duplicating it here double-fetched the API.
  const handleTabChange = useCallback((tab: DiscoverTab) => {
    useDiscoverStore.getState().setTab(tab);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    const store = useDiscoverStore.getState();
    store.setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim()) {
      debounceRef.current = setTimeout(() => {
        useDiscoverStore.getState().search(value.trim());
      }, 400);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    useDiscoverStore.getState().clearSearch();
  }, []);

  const handleSortChange = useCallback((next: DiscoverSort) => {
    useDiscoverStore.getState().setSort(next);
  }, []);

  const handleFiltersChange = useCallback((next: DiscoverFilters) => {
    useDiscoverStore.getState().setFilters(next);
  }, []);

  const handleExcludeToggle = useCallback((next: boolean) => {
    useDiscoverStore.getState().setExcludeLibrary(next);
  }, []);

  const handleRetry = useCallback(() => {
    const store = useDiscoverStore.getState();
    if (store.isSearching && store.searchQuery.trim()) {
      store.search(store.searchQuery.trim());
    } else {
      switch (store.activeTab) {
        case 'trending':
          store.fetchTrending();
          break;
        case 'popular':
          store.fetchPopular();
          break;
        case 'seasonal':
          store.fetchSeasonal();
          break;
        case 'random':
          store.fetchRandomPool();
          break;
        case 'recommendations':
          store.fetchRecommendations();
          break;
      }
    }
  }, []);

  // Infinite scroll — DiscoverGrid calls this when rendering nears the last
  // row. loadMore self-guards (in-flight fetch, per-mode hasNext).
  const handleLoadMore = useCallback(() => {
    useDiscoverStore.getState().loadMore();
  }, []);

  // Determine which data to display
  const isSearchMode = searchQuery.trim().length > 0;
  const isRandomMode = !isSearchMode && activeTab === 'random';
  const isRecommendationsMode = !isSearchMode && activeTab === 'recommendations';
  // Tabs that own their full render (loading/empty/error) and have no grid,
  // pagination or sort/filter controls.
  const isSpecialMode = isRandomMode || isRecommendationsMode;

  const rawItems = isSearchMode
    ? searchResults
    : activeTab === 'trending'
      ? trending
      : activeTab === 'popular'
        ? popular
        : activeTab === 'seasonal'
          ? seasonal
          : [];

  // Opt-in client-side exclusion of already-handled library entries (item 14).
  const items = useMemo(
    () => (excludedIds.size === 0 ? rawItems : rawItems.filter(m => !excludedIds.has(m.id))),
    [rawItems, excludedIds]
  );

  const page = isSearchMode
    ? searchPage
    : activeTab === 'trending'
      ? trendingPage
      : activeTab === 'popular'
        ? popularPage
        : activeTab === 'seasonal'
          ? seasonalPage
          : { current: 1, hasNext: false };

  const showLoading = isSearchMode ? isSearching : isLoading;
  const showEmpty = !isSpecialMode && !showLoading && items.length === 0;
  const showGrid = !isSpecialMode && items.length > 0;

  const showControls = !isRecommendationsMode;
  const showSortSelect = !isRandomMode;
  const showFiltersPanel = !isRandomMode;
  const showError = Boolean(error) && !showLoading;
  const showSkeleton = !isSpecialMode && showLoading && items.length === 0;

  // Remount the grid per tab so each tab starts at the top instead of
  // inheriting the previous scroll.
  const gridKey = isSearchMode ? 'search' : activeTab;

  return {
    tabs,
    activeTab,
    searchQuery,
    sort,
    filters,
    excludeLibrary,
    connected,
    libraryIds,
    excludedIds,
    items,
    page,
    error,
    gridKey,
    isSearchMode,
    isRandomMode,
    isRecommendationsMode,
    isSpecialMode,
    isLoading,
    showLoading,
    showEmpty,
    showGrid,
    showControls,
    showSortSelect,
    showFiltersPanel,
    showError,
    showSkeleton,
    selectedAnime,
    dialogOpen,
    setDialogOpen,
    handleCardClick,
    handleAddToLibrary,
    handleTabChange,
    handleSearchChange,
    handleClearSearch,
    handleSortChange,
    handleFiltersChange,
    handleExcludeToggle,
    handleRetry,
    handleLoadMore,
  };
}
