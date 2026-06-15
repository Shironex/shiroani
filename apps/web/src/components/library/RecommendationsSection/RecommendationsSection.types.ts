import type { AnimeDetailRecommendation, AnimeEntry, DiscoverMedia } from '@shiroani/shared';

export interface IRecommendationsSectionProps {
  /** Recommendation nodes from the cached {@link AnimeDetail}. */
  recommendations: AnimeDetailRecommendation[];
}

export type RecommendationNode = AnimeDetailRecommendation['mediaRecommendation'];

export interface IRecommendationCardProps {
  node: RecommendationNode;
  libraryEntry?: AnimeEntry;
  onAdd: (media: DiscoverMedia) => Promise<void> | void;
}

export interface IRecommendationsSectionView {
  readonly nodes: RecommendationNode[];
  readonly entryByAnilistId: Map<number, AnimeEntry>;
  readonly addToLibrary: (media: DiscoverMedia) => Promise<void>;
}
