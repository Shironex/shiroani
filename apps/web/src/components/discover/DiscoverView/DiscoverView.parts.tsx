import { useTranslation } from 'react-i18next';
import { Compass, SearchX, X } from 'lucide-react';
import type { DiscoverSort, DiscoverFilters } from '@shiroani/shared';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { DiscoverSortSelect } from '@/components/discover/DiscoverSortSelect';
import { DiscoverFiltersPanel } from '@/components/discover/DiscoverFiltersPanel';
import { RandomDiscoveryPanel } from '@/components/discover/RandomDiscoveryPanel';
import { RecommendationsPanel } from '@/components/discover/RecommendationsPanel';
import { Switch } from '@/components/ui/switch';
import type { IDiscoverViewView } from './DiscoverView.types';

interface ISearchBannerProps {
  onClear: () => void;
}

/** "Search results" label + quick clear, surfaced while searching. */
export function SearchBanner({ onClear }: ISearchBannerProps) {
  const { t } = useTranslation('discover');
  return (
    <div className="px-7 pb-3 border-b border-border-glass shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/90 font-semibold">
          {t('search.resultsLabel')}
        </span>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground/70 transition-colors"
        >
          <X className="w-3 h-3" />
          {t('search.clear')}
        </button>
      </div>
    </div>
  );
}

interface IDiscoverControlsProps {
  showControls: boolean;
  showSortSelect: boolean;
  showFiltersPanel: boolean;
  sort: DiscoverSort;
  filters: DiscoverFilters;
  excludeLibrary: boolean;
  connected: boolean;
  showLoading: boolean;
  onSortChange: (next: DiscoverSort) => void;
  onFiltersChange: (next: DiscoverFilters) => void;
  onExcludeToggle: (next: boolean) => void;
}

/**
 * Browse/search controls: sort (item 2), advanced filters (item 6) and the
 * library-exclude toggle (item 14). The Random tab keeps its own genre picker
 * but still honours the exclude toggle; the Recommendations tab owns its full
 * surface, so it skips controls.
 */
export function DiscoverControls({
  showControls,
  showSortSelect,
  showFiltersPanel,
  sort,
  filters,
  excludeLibrary,
  connected,
  showLoading,
  onSortChange,
  onFiltersChange,
  onExcludeToggle,
}: IDiscoverControlsProps) {
  const { t } = useTranslation('discover');

  if (!showControls) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showSortSelect ? (
          <DiscoverSortSelect value={sort} onChange={onSortChange} disabled={showLoading} />
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={excludeLibrary}
            onCheckedChange={onExcludeToggle}
            aria-label={t('controls.excludeLibrary')}
          />
          <span className="text-xs text-muted-foreground" title={t('controls.excludeLibraryHint')}>
            {t('controls.excludeLibrary')}
          </span>
        </label>
      </div>
      {showFiltersPanel && (
        <DiscoverFiltersPanel
          filters={filters}
          disabled={showLoading}
          connected={connected}
          onChange={onFiltersChange}
        />
      )}
    </div>
  );
}

type DiscoverBodyProps = Pick<
  IDiscoverViewView,
  | 'isRandomMode'
  | 'isRecommendationsMode'
  | 'isSpecialMode'
  | 'showError'
  | 'showSkeleton'
  | 'showEmpty'
  | 'error'
  | 'isSearchMode'
  | 'libraryIds'
  | 'excludedIds'
  | 'connected'
  | 'handleCardClick'
  | 'handleRetry'
>;

/** Special-mode panels (random/recommendations) plus error/loading/empty. */
export function DiscoverBody({
  isRandomMode,
  isRecommendationsMode,
  isSpecialMode,
  showError,
  showSkeleton,
  showEmpty,
  error,
  isSearchMode,
  libraryIds,
  excludedIds,
  connected,
  handleCardClick,
  handleRetry,
}: DiscoverBodyProps) {
  const { t } = useTranslation('discover');

  return (
    <>
      {/* Random discovery — owns its own loading/error/empty */}
      {isRandomMode && (
        <RandomDiscoveryPanel
          libraryIds={libraryIds}
          excludedIds={excludedIds}
          onCardClick={handleCardClick}
          onError={handleRetry}
        />
      )}

      {/* Community recommendations — owns its own loading/error/empty */}
      {isRecommendationsMode && (
        <RecommendationsPanel
          libraryIds={libraryIds}
          connected={connected}
          onCardClick={handleCardClick}
        />
      )}

      {/* Error state */}
      {!isSpecialMode && showError && <AniListErrorState error={error} onRetry={handleRetry} />}

      {/* Loading state — only show skeleton on initial load (no items yet) */}
      {showSkeleton && <DiscoverSkeleton />}

      {/* Empty state */}
      {showEmpty && !error && (
        <EmptyState
          icon={isSearchMode ? SearchX : Compass}
          title={isSearchMode ? t('empty.noResultsTitle') : t('empty.noAnimeTitle')}
          subtitle={isSearchMode ? t('empty.noResultsSubtitle') : t('empty.noAnimeSubtitle')}
        />
      )}
    </>
  );
}
