import type { AiringAnime, AnimeDetail, AnimeDetailRanking } from '@shiroani/shared';

export interface IAnimeInfoStatsProps {
  anime: AiringAnime;
  details: AnimeDetail | null;
  topRanking: AnimeDetailRanking | null;
  format?: string;
  status?: string;
  episodes?: number | null;
}

export type IAnimeInfoStatsView = Record<string, never>;
