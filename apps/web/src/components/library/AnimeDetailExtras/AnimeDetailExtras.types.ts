import type { AnimeDetailRecommendation, AnimeDetailStreamingEpisode } from '@shiroani/shared';

export interface IAnimeDetailExtrasProps {
  /** AniList media id of the open library entry. */
  anilistId: number;
  /** Open a URL in the in-app browser (new tab) and close the modal. */
  onNavigate: (url: string) => void;
}

export interface IAnimeDetailExtrasView {
  /** True while the detail is being fetched and nothing is cached yet. */
  readonly isLoading: boolean;
  readonly recommendations: AnimeDetailRecommendation[];
  readonly streamingEpisodes: AnimeDetailStreamingEpisode[];
  readonly siteUrl: string | undefined;
  readonly idMal: number | undefined;
}
