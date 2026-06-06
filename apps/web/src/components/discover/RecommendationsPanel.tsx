import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { AniListErrorState } from '@/components/shared/AniListErrorState';
import { DiscoverSkeleton } from '@/components/discover/DiscoverSkeleton';
import { RecommendationCard } from '@/components/discover/RecommendationCard';
import { useAddDiscoverMediaToLibrary } from '@/components/discover/useAddDiscoverMediaToLibrary';
import { useDiscoverStore, type DiscoverMedia } from '@/stores/useDiscoverStore';

interface RecommendationsPanelProps {
  /** anilistIds present in the user's local library — drives the card badge. */
  libraryIds: Set<number>;
  /** Whether AniList is connected — gates the vote buttons. */
  connected: boolean;
  onCardClick: (media: DiscoverMedia) => void;
}

/**
 * Community recommendations tab (item C5). Browses AniList `Page.recommendations`
 * (media->media pairings sorted by net community vote), reusing DiscoverCard via
 * RecommendationCard and adding thumb up/down voting. Browse needs no auth; only
 * voting is gated on `connected`. Owns its own loading/empty/error like the
 * Random panel.
 */
export const RecommendationsPanel = memo(function RecommendationsPanel({
  libraryIds,
  connected,
  onCardClick,
}: RecommendationsPanelProps) {
  const { t } = useTranslation('discover');
  const recommendations = useDiscoverStore(s => s.recommendations);
  const isLoading = useDiscoverStore(s => s.isRecommendationsLoading);
  const error = useDiscoverStore(s => s.error);

  const handleAddToLibrary = useAddDiscoverMediaToLibrary();

  const handleRetry = useCallback(() => {
    useDiscoverStore.getState().fetchRecommendations();
  }, []);

  const handleVote = useCallback(
    (pair: AniListCommunityRecommendation, rating: RecommendationRating) => {
      void useDiscoverStore
        .getState()
        .voteRecommendation(pair, rating)
        .catch(() => {
          toast.error(t('recommendations.voteFailed'));
        });
    },
    [t]
  );

  if (error && !isLoading) {
    return <AniListErrorState error={error} onRetry={handleRetry} />;
  }

  if (isLoading && recommendations.length === 0) {
    return <DiscoverSkeleton />;
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t('recommendations.emptyTitle')}
        subtitle={t('recommendations.emptySubtitle')}
      />
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3.5',
        'grid-cols-2',
        'sm:grid-cols-3',
        'md:grid-cols-4',
        'lg:grid-cols-5',
        '2xl:grid-cols-6'
      )}
    >
      {recommendations.map(pair => (
        <RecommendationCard
          key={pair.id}
          pair={pair}
          inLibrary={libraryIds.has(pair.mediaRecommendation.id)}
          connected={connected}
          onClick={onCardClick}
          onAddToLibrary={handleAddToLibrary}
          onVote={handleVote}
        />
      ))}
    </div>
  );
});
