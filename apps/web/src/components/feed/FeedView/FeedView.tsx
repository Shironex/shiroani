import { Rss, RefreshCw, Inbox, CheckCheck, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { FeedHero } from '../FeedHero';
import { FeedSidebar } from '../FeedSidebar';
import { FeedReaderModal } from '../FeedReaderModal';
import { FeedLoadingAnimation } from '../FeedLoadingAnimation';
import { useFeedView } from './FeedView.hooks';
import { FeedList, LanguageToggle } from './FeedView.parts';

export default function FeedView() {
  const {
    t,
    categoryFilterOptions,
    languageFilterOptions,
    items,
    sources,
    total,
    isLoading,
    error,
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
  } = useFeedView();

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
        filters={categoryFilterOptions}
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
            <LanguageToggle
              options={languageFilterOptions}
              active={languageFilter}
              onSelect={setLanguageFilter}
            />

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
              {hasNewCount && (
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
                  ) : showNoResults ? (
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
                    <FeedList
                      items={listItems}
                      feedView={feedView}
                      readIds={readIds}
                      onOpen={handleOpenInReader}
                      onOpenExternal={handleOpenExternal}
                    />
                  )}

                  {canLoadMore && (
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
