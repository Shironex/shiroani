import type { AnimeDetail, AnimeDetailRecommendation, DiscoverMedia } from '@shiroani/shared';

export interface IAnimeInfoRecommendationsProps {
  details: AnimeDetail | null;
}

export interface IAnimeInfoRecommendationsView {
  readonly nodes: AnimeDetailRecommendation['mediaRecommendation'][];
  readonly inLibraryIds: Set<number>;
  readonly addToLibrary: (media: DiscoverMedia) => void;
}

export interface IRecommendationCardProps {
  node: AnimeDetailRecommendation['mediaRecommendation'];
  inLibrary: boolean;
  onAdd: (media: DiscoverMedia) => void;
}

export interface IRecommendationsListProps {
  nodes: AnimeDetailRecommendation['mediaRecommendation'][];
  inLibraryIds: Set<number>;
  onAdd: (media: DiscoverMedia) => void;
}
