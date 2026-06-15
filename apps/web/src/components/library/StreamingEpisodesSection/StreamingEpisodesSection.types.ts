import type { AnimeDetailStreamingEpisode } from '@shiroani/shared';

export interface IStreamingEpisodesSectionProps {
  /** Per-episode legal-stream entries from the cached {@link AnimeDetail}. */
  episodes: AnimeDetailStreamingEpisode[];
}

export type IStreamingEpisodesSectionView = Record<string, never>;
