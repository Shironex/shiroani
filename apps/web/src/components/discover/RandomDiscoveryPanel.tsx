import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';
import { useAddDiscoverMediaToLibrary } from './useAddDiscoverMediaToLibrary';
import { RandomFiltersPanel } from './random/RandomFiltersPanel';
import { RandomShowcaseCard } from './random/RandomShowcaseCard';
import { RandomPeekChip } from './random/RandomPeekChip';
import { RandomSkeleton } from './random/RandomSkeleton';
import { useRandomCarousel } from './random/useRandomCarousel';
import { buildShowcaseMeta } from './random/random-utils';

interface RandomDiscoveryPanelProps {
  libraryIds: Set<number>;
  /** anilistIds to drop from the pool when the exclude toggle is on (item 14). */
  excludedIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onError: () => void;
}

export const RandomDiscoveryPanel = memo(function RandomDiscoveryPanel({
  libraryIds,
  excludedIds,
  onCardClick,
  onError,
}: RandomDiscoveryPanelProps) {
  const { t } = useTranslation('discover');
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

      {isLoading && pool.length === 0 ? (
        <RandomSkeleton />
      ) : pool.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t('random.emptyTitle')}
          subtitle={t('random.emptySubtitle')}
        />
      ) : current ? (
        <div className="relative">
          {/* Banner backdrop — banner image blurred + accent gradient overlay */}
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-[14px]">
            {(() => {
              const banner = buildShowcaseMeta(current).banner;
              return banner ? (
                <img
                  src={banner}
                  alt=""
                  aria-hidden
                  className="w-full h-full object-cover opacity-25 blur-2xl scale-110"
                />
              ) : null;
            })()}
            {/* News hero-style accent gradient + soft vignette */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(120deg, oklch(from var(--primary) l c h / 0.18), oklch(from var(--primary) l c h / 0.02) 60%), linear-gradient(180deg, transparent, oklch(0 0 0 / 0.35))',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/55 to-background/95" />
          </div>

          <div className="relative rounded-[14px] border border-border-glass bg-card/40 backdrop-blur-sm overflow-hidden">
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

            {(peekPrev || peekNext) && (
              <div className="border-t border-border-glass/60 bg-background/20 flex items-center justify-between gap-3 px-4 py-3">
                {peekPrev ? (
                  <RandomPeekChip
                    media={peekPrev}
                    direction="prev"
                    onClick={prev}
                    inLibrary={libraryIds.has(peekPrev.id)}
                  />
                ) : (
                  <div />
                )}
                {peekNext ? (
                  <RandomPeekChip
                    media={peekNext}
                    direction="next"
                    onClick={next}
                    inLibrary={libraryIds.has(peekNext.id)}
                  />
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
});
