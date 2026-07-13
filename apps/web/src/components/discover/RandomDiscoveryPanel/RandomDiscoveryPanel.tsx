import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { RandomFiltersPanel } from '@/components/discover/random/RandomFiltersPanel';
import { RandomShowcaseCard } from '@/components/discover/random/RandomShowcaseCard';
import { RandomSkeleton } from '@/components/discover/random/RandomSkeleton';
import { useRandomDiscoveryPanel } from './RandomDiscoveryPanel.hooks';
import { PeekFooter, ShowcaseBackdrop } from './RandomDiscoveryPanel.parts';
import type { IRandomDiscoveryPanelProps } from './RandomDiscoveryPanel.types';

function RandomDiscoveryPanel({
  libraryIds,
  excludedIds,
  onCardClick,
  onError,
}: IRandomDiscoveryPanelProps) {
  const { t } = useTranslation('discover');
  const {
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
  } = useRandomDiscoveryPanel({ excludedIds });

  if (error) {
    return <AniListErrorState error={error} onRetry={onError} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <RandomFiltersPanel
        included={included}
        excluded={excluded}
        disabled={isLoading}
        onChange={handleGenresChange}
      />

      {showSkeleton ? (
        <RandomSkeleton />
      ) : isEmpty ? (
        <EmptyState
          icon={Sparkles}
          title={t('random.emptyTitle')}
          subtitle={t('random.emptySubtitle')}
        />
      ) : current ? (
        <div className="relative">
          {/* Banner backdrop — banner image blurred + accent gradient overlay */}
          <ShowcaseBackdrop banner={banner} />

          <div className="relative rounded-xl border border-border-glass bg-card/40 backdrop-blur-sm overflow-hidden">
            <RandomShowcaseCard
              media={current}
              index={index}
              total={pool.length}
              inLibrary={libraryIds.has(current.id)}
              isLoading={isLoading}
              onPrev={prev}
              onNext={next}
              onRefetch={handleRefetch}
              onOpenDetails={() => onCardClick(current)}
              onAddToLibrary={() => handleAddToLibrary(current)}
            />

            {showPeekFooter && (
              <PeekFooter
                peekPrev={peekPrev}
                peekNext={peekNext}
                libraryIds={libraryIds}
                onPrev={prev}
                onNext={next}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(RandomDiscoveryPanel);
