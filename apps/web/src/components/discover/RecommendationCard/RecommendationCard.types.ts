import type { AniListCommunityRecommendation, RecommendationRating } from '@shiroani/shared';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';

export interface IRecommendationCardProps {
  pair: AniListCommunityRecommendation;
  inLibrary?: boolean;
  /** Whether AniList is connected — gates the thumb up/down vote buttons. */
  connected: boolean;
  /** True while this pair's vote write is in flight — disables the buttons. */
  isVoting?: boolean;
  onClick?: (media: DiscoverMedia) => void;
  onAddToLibrary?: (media: DiscoverMedia) => void;
  onVote?: (pair: AniListCommunityRecommendation, rating: RecommendationRating) => void;
}

export interface IVoteButtonProps {
  active: boolean;
  disabled: boolean;
  direction: 'up' | 'down';
  label: string;
  onClick: () => void;
}

export interface IRecommendationCardView {
  readonly media: DiscoverMedia;
  readonly sourceTitle: string;
  readonly userRating: AniListCommunityRecommendation['userRating'];
  readonly handleVote: (rating: RecommendationRating) => void;
}
