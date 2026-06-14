import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';
import { ViewHeader } from '@/components/shared/ViewHeader';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { DiscoverGrid } from '@/components/discover/DiscoverGrid';
import { AnimeInfoDialog } from '@/components/schedule/AnimeInfoDialog';
import { useDiscoverView } from './DiscoverView.hooks';
import { DiscoverBody, DiscoverControls, SearchBanner } from './DiscoverView.parts';
import type { DiscoverTab } from './DiscoverView.types';

export default function DiscoverView() {
  const { t } = useTranslation('discover');
  const {
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
  } = useDiscoverView();

  const controls = (
    <DiscoverControls
      showControls={showControls}
      showSortSelect={showSortSelect}
      showFiltersPanel={showFiltersPanel}
      sort={sort}
      filters={filters}
      excludeLibrary={excludeLibrary}
      connected={connected}
      showLoading={showLoading}
      onSortChange={handleSortChange}
      onFiltersChange={handleFiltersChange}
      onExcludeToggle={handleExcludeToggle}
    />
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-fade-in relative">
      <ViewHeader<DiscoverTab>
        icon={Compass}
        title={t('title')}
        subtitle={t('subtitle')}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={t('searchPlaceholder')}
        filters={isSearchMode ? undefined : tabs}
        activeFilter={activeTab}
        onFilterChange={handleTabChange}
      />

      {/* Search-mode banner — ViewHeader hides its filter row while searching,
          so surface the "Wyniki wyszukiwania" label + quick clear here. */}
      {isSearchMode && <SearchBanner onClear={handleClearSearch} />}

      {/* ── Content region with clipped kanji watermark layer ──────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative kanji watermark — 探 (saga/tan: search / explore).
            Clipped wrapper keeps the glyph's negative offsets from producing
            scrollbars on either axis. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <KanjiWatermark kanji="探" position="br" size={300} opacity={0.03} />
        </div>

        {showGrid ? (
          /* Browse/search grid — controls stay fixed while the virtualized
             grid owns scrolling (mirrors LibraryView). Remount per tab so each
             tab starts at the top instead of inheriting the previous scroll. */
          <div className="absolute inset-0 z-[1] px-7 pt-5 flex flex-col">
            {controls}
            {showError && <AniListErrorState error={error} onRetry={handleRetry} />}
            <div className="flex-1 min-h-0">
              <DiscoverGrid
                key={gridKey}
                items={items}
                libraryIds={libraryIds}
                hasNextPage={page.hasNext}
                isLoadingMore={isLoading}
                onLoadMore={handleLoadMore}
                onCardClick={handleCardClick}
                onAddToLibrary={handleAddToLibrary}
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
            <div className="relative z-[1] px-7 pt-5 pb-24">
              {controls}

              <DiscoverBody
                isRandomMode={isRandomMode}
                isRecommendationsMode={isRecommendationsMode}
                isSpecialMode={isSpecialMode}
                showError={showError}
                showSkeleton={showSkeleton}
                showEmpty={showEmpty}
                error={error}
                isSearchMode={isSearchMode}
                libraryIds={libraryIds}
                excludedIds={excludedIds}
                connected={connected}
                handleCardClick={handleCardClick}
                handleRetry={handleRetry}
              />
            </div>
          </div>
        )}
      </div>

      <AnimeInfoDialog anime={selectedAnime} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
