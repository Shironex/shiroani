import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rss, RefreshCw, Inbox, CheckCheck, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { useFeedStore, getFilteredItems } from '@/stores/useFeedStore';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { FeedCategory, FeedItem, FeedLanguage } from '@shiroani/shared';
import { FeedHero } from './FeedHero';
import { FeedListItem } from './FeedListItem';
import { FeedSidebar } from './FeedSidebar';
import { FeedReaderModal } from './FeedReaderModal';
import { FeedLoadingAnimation } from './FeedLoadingAnimation';
import { useCategoryLabels, useLanguageLabels } from './feed-constants';

// Extract stable action references outside the component
const {
  fetchItems,
  refreshFeeds,
  setCategoryFilter,
  setLanguageFilter,
  setSourceFilter,
  markAllSeen,
  markAllRead,
} = useFeedStore.getState();

type FeedViewState = 'loading' | 'error' | 'empty' | 'content';

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

export function FeedView() {
  const { t } = useTranslation('feed');
  const categoryLabels = useCategoryLabels();
  const languageLabels = useLanguageLabels();
  const CATEGORY_FILTER_OPTIONS = useMemo(
    () =>
      (Object.entries(categoryLabels) as [FeedCategory | 'all', string][])
        .filter(([key]) => key !== 'community')
        .map(([value, label]) => ({ value, label })),
    [categoryLabels]
  );
  const LANGUAGE_FILTER_OPTIONS = useMemo(
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
  // unread subscription counter. Fires once per mount.
  useEffect(() => {
    markAllSeen();
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
    fetchItems(false, { bootstrapIfEmpty: true });
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

  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  const handleCategoryFilterChange = useCallback((category: FeedCategory | 'all') => {
    setCategoryFilter(category);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      {/* View header — title / search / category tabs */}
      <ViewHeader
        icon={Rss}
        title={t('title')}
        subtitle={subtitle}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('searchPlaceholder')}
        filters={CATEGORY_FILTER_OPTIONS}
        activeFilter={categoryFilter}
        onFilterChange={handleCategoryFilterChange}
        actions={
          <>
            {/* Primary view toggle — Wszystkie vs Zakładki. Sits at the front of
                the header actions so it's always reachable, regardless of
                viewport (sidebar hides below xl). */}
            <div
              className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5"
              role="group"
              aria-label={t('viewToggle.ariaLabel')}
            >
              <button
                type="button"
                onClick={() => setFeedView('all')}
                aria-pressed={feedView === 'all'}
                className={cn(
                  'px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
                  feedView === 'all'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground/80 hover:text-foreground'
                )}
              >
                {t('viewToggle.all')}
              </button>
              <button
                type="button"
                onClick={() => setFeedView('bookmarks')}
                aria-pressed={feedView === 'bookmarks'}
                className={cn(
                  'flex items-center gap-1 px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
                  feedView === 'bookmarks'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground/80 hover:text-foreground'
                )}
              >
                <Bookmark className="w-3 h-3" />
                <span>{t('viewToggle.bookmarks')}</span>
                {bookmarks.size > 0 && (
                  <span
                    className={cn(
                      'font-mono text-[9.5px]',
                      feedView === 'bookmarks' ? 'text-primary/80' : 'text-muted-foreground/60'
                    )}
                  >
                    · {bookmarks.size}
                  </span>
                )}
              </button>
            </div>

            <div className="w-px h-4 bg-border-glass mx-1" />

            {/* Language pill toggle — mirrors mock sub-header */}
            <div
              className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] p-0.5"
              role="group"
              aria-label={t('language.ariaLabel')}
            >
              {LANGUAGE_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguageFilter(value)}
                  aria-pressed={languageFilter === value}
                  className={cn(
                    'px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
                    languageFilter === value
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground/80 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-border-glass mx-1" />

            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => markAllRead()}
              disabled={feedView === 'bookmarks' || visibleItems.length === 0}
              tooltip={t('actions.markAllRead')}
            >
              <CheckCheck className="w-4 h-4" />
            </TooltipButton>

            <TooltipButton
              variant="ghost"
              size="icon"
              className={cn(
                'w-8 h-8 relative',
                lastRefreshNewCount !== null &&
                  lastRefreshNewCount > 0 &&
                  'text-primary hover:text-primary'
              )}
              onClick={() => refreshFeeds()}
              disabled={isRefreshing}
              tooltip={t('actions.refresh')}
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              {lastRefreshNewCount !== null && lastRefreshNewCount > 0 && (
                <span
                  aria-label={t('newCount', { count: lastRefreshNewCount })}
                  className={cn(
                    'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full',
                    'bg-primary text-[9px] font-bold leading-none grid place-items-center',
                    'text-background animate-fade-in'
                  )}
                >
                  +{lastRefreshNewCount}
                </span>
              )}
            </TooltipButton>
          </>
        }
      />

      {/* Content region with clipped watermark layer */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 報 (hou: news / report). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="報" position="br" size={300} opacity={0.03} />
        </div>

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-thin">
          <div className="relative z-[1]">
            {feedView === 'all' && viewState === 'loading' ? (
              <FeedLoadingAnimation />
            ) : feedView === 'all' && viewState === 'error' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Rss className="w-10 h-10 text-destructive/60" />
                <p className="text-sm text-center max-w-xs">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchItems()}>
                  {t('actions.tryAgain')}
                </Button>
              </div>
            ) : feedView === 'all' && viewState === 'empty' ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                  <Inbox className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground/70">{t('empty.title')}</p>
                  <p className="text-xs text-muted-foreground/50">{t('empty.subtitle')}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 text-primary hover:bg-primary/10"
                  onClick={() => refreshFeeds()}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {t('actions.refresh')}
                </Button>
              </div>
            ) : (
              <div
                role="region"
                aria-label={t('regionLabel')}
                className={cn(
                  'px-6 pt-4 pb-16 gap-4 grid',
                  'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]'
                )}
              >
                {/* Left column — hero + list */}
                <div className="min-w-0 flex flex-col gap-3">
                  {heroItem && <FeedHero item={heroItem} onOpen={handleOpenInReader} />}

                  {feedView === 'bookmarks' && visibleItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <Inbox className="w-8 h-8 opacity-40" />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-foreground/70">
                          {t('empty.noBookmarksTitle')}
                        </p>
                        <p className="text-xs text-muted-foreground/50">
                          {t('empty.noBookmarksSubtitle')}
                        </p>
                      </div>
                    </div>
                  ) : searchedItems.length === 0 && searchQuery && feedView === 'all' ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <Inbox className="w-8 h-8 opacity-40" />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-foreground/70">
                          {t('empty.noResultsTitle')}
                        </p>
                        <p className="text-xs text-muted-foreground/50">
                          {t('empty.noResultsSubtitle', { query: searchQuery })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {listItems.map(item => (
                        <FeedListItem
                          key={item.id}
                          item={item}
                          unread={feedView === 'all' && !readIds.has(item.id)}
                          onOpen={handleOpenInReader}
                          onOpenExternal={handleOpenExternal}
                        />
                      ))}
                    </div>
                  )}

                  {feedView === 'all' && hasMore && !searchQuery && (
                    <div className="flex justify-center pt-3 pb-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'border-white/[0.08] text-muted-foreground/70',
                          'hover:border-white/[0.12] hover:text-foreground',
                          'transition-all duration-200'
                        )}
                        onClick={handleLoadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            {t('actions.loadingMore')}
                          </>
                        ) : (
                          t('actions.loadMore')
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right sidebar */}
                <div className="min-w-0 xl:sticky xl:top-2">
                  <FeedSidebar
                    sources={sources}
                    items={items}
                    sourceFilter={sourceFilter}
                    onSetSourceFilter={setSourceFilter}
                    totalCount={total}
                    isBookmarksView={feedView === 'bookmarks'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reader modal */}
      <FeedReaderModal
        item={readerItem}
        open={isReaderOpen}
        onOpenChange={open => {
          setIsReaderOpen(open);
          if (!open) {
            // keep item briefly so the closing animation has content to render
            setTimeout(() => setReaderItem(null), 200);
          }
        }}
        relatedItems={items}
        onOpenRelated={handleOpenInReader}
        onOpenExternal={handleOpenExternal}
      />
    </div>
  );
}
