import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeedStore, getFilteredItems } from '@/stores/useFeedStore';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { FeedCategory, FeedItem, FeedLanguage } from '@shiroani/shared';
import { useCategoryLabels, useLanguageLabels } from '../feed-constants';
import { getFeedViewState } from '../feed-view-state';
import type { IFeedViewView } from './FeedView.types';

// Extract stable action references outside the component
const {
  fetchItems,
  refreshFeeds,
  setCategoryFilter,
  setLanguageFilter,
  setSourceFilter,
  markAllRead,
} = useFeedStore.getState();

export function useFeedView(): IFeedViewView {
  const { t } = useTranslation('feed');
  const categoryLabels = useCategoryLabels();
  const languageLabels = useLanguageLabels();
  const categoryFilterOptions = useMemo(
    () =>
      (Object.entries(categoryLabels) as [FeedCategory | 'all', string][])
        .filter(([key]) => key !== 'community')
        .map(([value, label]) => ({ value, label })),
    [categoryLabels]
  );
  const languageFilterOptions = useMemo(
    () =>
      (Object.entries(languageLabels) as [FeedLanguage | 'all', string][]).map(
        ([value, label]) => ({
          value,
          label,
        })
      ),
    [languageLabels]
  );
  const items = useFeedStore(getFilteredItems);
  const sources = useFeedStore(s => s.sources);
  const total = useFeedStore(s => s.total);
  const isLoading = useFeedStore(s => s.isLoading);
  const error = useFeedStore(s => s.error);
  const hasMore = useFeedStore(s => s.hasMore);
  const categoryFilter = useFeedStore(s => s.categoryFilter);
  const languageFilter = useFeedStore(s => s.languageFilter);
  const sourceFilter = useFeedStore(s => s.sourceFilter);
  const isRefreshing = useFeedStore(s => s.isRefreshing);
  const isBootstrapping = useFeedStore(s => s.isBootstrapping);
  const lastRefreshNewCount = useFeedStore(s => s.lastRefreshNewCount);
  const readIds = useFeedStore(s => s.readIds);
  const bookmarks = useFeedBookmarksStore(s => s.bookmarks);
  const hasTriggeredVisibleBootstrap = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [feedView, setFeedView] = useState<'all' | 'bookmarks'>('all');
  const [readerItem, setReaderItem] = useState<FeedItem | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const navigateToBrowser = useNavigateToBrowser();

  const handleOpenInReader = useCallback((item: FeedItem) => {
    useFeedStore.getState().markRead(item.id);
    setReaderItem(item);
    setIsReaderOpen(true);
  }, []);

  const handleOpenExternal = useCallback(
    (item: FeedItem) => {
      navigateToBrowser(item.url);
    },
    [navigateToBrowser]
  );

  const handleLoadMore = useCallback(() => {
    fetchItems(true);
  }, []);

  // Clear the refresh count badge after 5 seconds
  useEffect(() => {
    if (lastRefreshNewCount !== null && lastRefreshNewCount > 0) {
      const timer = setTimeout(() => {
        useFeedStore.setState({ lastRefreshNewCount: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastRefreshNewCount]);

  // Entering the Feed view counts as "caught up" — clears the newtab greeting's
  // unread subscription counter. Fires once per mount. Resolved from the store
  // at call time (rather than the module-level reference) so tests can stub it.
  useEffect(() => {
    useFeedStore.getState().markAllSeen();
  }, []);

  useEffect(() => {
    const canBootstrapVisibleFeed =
      items.length === 0 &&
      !isLoading &&
      !isRefreshing &&
      !isBootstrapping &&
      !error &&
      categoryFilter === 'all' &&
      languageFilter === 'all';

    if (!canBootstrapVisibleFeed || hasTriggeredVisibleBootstrap.current) {
      return;
    }

    hasTriggeredVisibleBootstrap.current = true;
    // Resolved from the store at call time so tests can stub the fetch.
    useFeedStore.getState().fetchItems(false, { bootstrapIfEmpty: true });
  }, [
    items.length,
    isLoading,
    isRefreshing,
    isBootstrapping,
    error,
    categoryFilter,
    languageFilter,
  ]);

  // Client-side search overlay on top of store-filtered items
  const searchedItems = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(item => {
      const title = item.title?.toLowerCase() ?? '';
      const description = item.description?.toLowerCase() ?? '';
      const source = item.sourceName?.toLowerCase() ?? '';
      const author = item.author?.toLowerCase() ?? '';
      return (
        title.includes(needle) ||
        description.includes(needle) ||
        source.includes(needle) ||
        author.includes(needle)
      );
    });
  }, [items, searchQuery]);

  // Bookmarks tab swaps the feed source for stored snapshots. Each snapshot is
  // mapped into a `FeedItem`-shaped object so the existing list item component
  // can render it without bespoke branching; fields the snapshot doesn't carry
  // (sourceCategory, sourceLanguage, etc.) fall back to safe defaults.
  const visibleItems = useMemo<FeedItem[]>(() => {
    if (feedView !== 'bookmarks') return searchedItems;
    return Array.from(bookmarks.values()).map(snap => ({
      id: snap.id,
      feedSourceId: 0,
      sourceName: snap.sourceName,
      sourceColor: snap.sourceColor,
      sourceCategory: 'news',
      sourceLanguage: 'en',
      // Snapshots carry no source context; don't attempt on-demand extraction.
      sourceSupportsFullContent: false,
      guid: '',
      title: snap.title,
      description: snap.description,
      url: snap.url,
      imageUrl: snap.imageUrl,
      publishedAt: snap.publishedAt,
      categories: [],
      createdAt: new Date(snap.bookmarkedAt).toISOString(),
    }));
  }, [feedView, searchedItems, bookmarks]);

  const heroItem = feedView === 'bookmarks' ? null : (visibleItems[0] ?? null);
  const listItems = heroItem ? visibleItems.slice(1) : visibleItems;

  const subtitle = useMemo(() => {
    const sourceCount = sources.filter(s => s.enabled).length;
    const totalLabel = total > 0 ? t('summary.entries', { count: total }) : t('summary.noEntries');
    if (sourceCount === 0) return totalLabel;
    return t('summary.withSources', {
      entries: totalLabel,
      sources: t('summary.sources', { count: sourceCount }),
    });
  }, [sources, total, t]);

  const viewState = getFeedViewState({
    itemsCount: items.length,
    isLoading,
    isRefreshing,
    isBootstrapping,
    error,
  });

  const hasNewCount = lastRefreshNewCount !== null && lastRefreshNewCount > 0;
  const showNoResults = searchedItems.length === 0 && searchQuery !== '' && feedView === 'all';
  const canLoadMore = feedView === 'all' && hasMore && searchQuery === '';

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleCategoryFilterChange = useCallback((category: FeedCategory | 'all') => {
    setCategoryFilter(category);
  }, []);

  return {
    t,
    categoryFilterOptions,
    languageFilterOptions,
    items,
    sources,
    total,
    isLoading,
    error,
    hasMore,
    categoryFilter,
    languageFilter,
    sourceFilter,
    isRefreshing,
    lastRefreshNewCount,
    readIds,
    bookmarks,
    searchQuery,
    feedView,
    setFeedView,
    readerItem,
    isReaderOpen,
    setIsReaderOpen,
    setReaderItem,
    searchedItems,
    visibleItems,
    heroItem,
    listItems,
    subtitle,
    viewState,
    hasNewCount,
    showNoResults,
    canLoadMore,
    handleOpenInReader,
    handleOpenExternal,
    handleLoadMore,
    handleSearchChange,
    handleCategoryFilterChange,
    fetchItems,
    refreshFeeds,
    setLanguageFilter,
    setSourceFilter,
    markAllRead,
  };
}
