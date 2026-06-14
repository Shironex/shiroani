import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IRecommendationsPanelProps {
  /** anilistIds present in the user's local library — drives the card badge. */
  libraryIds: Set<number>;
  /** Whether AniList is connected — gates the vote buttons. */
  connected: boolean;
  onCardClick: (media: DiscoverMedia) => void;
}

export interface IRecommendationsPanelView {
  readonly recommendations: AniListCommunityRecommendation[];
  readonly votingIds: Set<number>;
  readonly showError: boolean;
  readonly error: string | null;
  readonly showSkeleton: boolean;
  readonly isEmpty: boolean;
  readonly handleAddToLibrary: (media: DiscoverMedia) => Promise<void>;
  readonly handleRetry: () => void;
  readonly handleVote: (pair: AniListCommunityRecommendation, rating: RecommendationRating) => void;
}
