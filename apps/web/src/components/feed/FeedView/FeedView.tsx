import { Rss, RefreshCw, Inbox, CheckCheck, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { EmptyState } from '@/components/shared/EmptyState';
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
              className="flex items-center gap-0.5 rounded-lg bg-foreground/[0.03] border border-border-glass p-0.5"
              role="group"
              aria-label={t('viewToggle.ariaLabel')}
            >
              <button
                type="button"
                onClick={() => setFeedView('all')}
                aria-pressed={feedView === 'all'}
                className={cn(
                  'px-2.5 h-6 rounded-md text-[11px] font-medium transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98]',
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:scale-[0.98]',
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
                    'text-primary-foreground animate-fade-in'
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

        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <div className="relative z-[1]">
            {feedView === 'all' && viewState === 'loading' ? (
              <FeedLoadingAnimation />
            ) : feedView === 'all' && viewState === 'error' ? (
              <div className="flex items-center justify-center w-full px-6 py-16">
                <div className="w-full max-w-md rounded-xl border border-destructive/25 bg-destructive/[0.06] px-5 py-6 flex flex-col items-center gap-3 text-center">
                  <div className="size-14 rounded-full bg-destructive/20 border border-destructive/40 grid place-items-center">
                    <Rss className="size-6 text-destructive" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fetchItems()}
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('actions.tryAgain')}
                  </Button>
                </div>
              </div>
            ) : feedView === 'all' && viewState === 'empty' ? (
              <EmptyState
                icon={Inbox}
                title={t('empty.title')}
                subtitle={t('empty.subtitle')}
                action={{
                  label: t('actions.refresh'),
                  onClick: () => refreshFeeds(),
                  icon: RefreshCw,
                }}
              />
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
                    <EmptyState
                      icon={Inbox}
                      title={t('empty.noBookmarksTitle')}
                      subtitle={t('empty.noBookmarksSubtitle')}
                    />
                  ) : showNoResults ? (
                    <EmptyState
                      icon={Inbox}
                      title={t('empty.noResultsTitle')}
                      subtitle={t('empty.noResultsSubtitle', { query: searchQuery })}
                    />
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
                          'border-border-glass text-muted-foreground/70',
                          'hover:border-foreground/20 hover:text-foreground',
                          'transition-colors duration-200'
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
