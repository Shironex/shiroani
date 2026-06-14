import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { RecommendationCard } from '@/components/discover/RecommendationCard';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

interface IRecommendationGridProps {
  recommendations: AniListCommunityRecommendation[];
  libraryIds: Set<number>;
  connected: boolean;
  votingIds: Set<number>;
  onCardClick: (media: DiscoverMedia) => void;
  onAddToLibrary: (media: DiscoverMedia) => void;
  onVote: (pair: AniListCommunityRecommendation, rating: RecommendationRating) => void;
}

/** The responsive grid of {@link RecommendationCard}s for the populated state. */
export function RecommendationGrid({
  recommendations,
  libraryIds,
  connected,
  votingIds,
  onCardClick,
  onAddToLibrary,
  onVote,
}: IRecommendationGridProps) {
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
          isVoting={votingIds.has(pair.id)}
          onClick={onCardClick}
          onAddToLibrary={onAddToLibrary}
          onVote={onVote}
        />
      ))}
    </div>
  );
}
