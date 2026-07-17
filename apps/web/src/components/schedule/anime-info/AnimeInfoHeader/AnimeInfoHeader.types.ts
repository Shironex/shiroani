import type { AiringAnime, AnimeDetail } from '@shiroani/shared';

export interface IAnimeInfoHeaderProps {
  anime: AiringAnime;
  title: string;
  details: AnimeDetail | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
}

export type IAnimeInfoHeaderView = Record<string, never>;
