import type { MouseEvent } from 'react';
import type { AnimeDetail } from '@shiroani/shared';

export interface IAnimeInfoHeaderProps {
  title: string;
  details: AnimeDetail | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  accentColor?: string | null;
  isSubscribed: boolean;
  onToggleSubscribe: (e: MouseEvent) => void;
}

export type IAnimeInfoHeaderView = Record<string, never>;
