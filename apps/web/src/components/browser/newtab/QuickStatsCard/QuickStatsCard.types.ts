import type { Tv } from 'lucide-react';

export interface IQuickStatsCardView {
  readonly libraryCount: number;
  readonly episodesWatched: number;
  readonly streakDays: number;
}

export interface IStatTileProps {
  icon: typeof Tv;
  label: string;
  value: number | string;
  tone?: 'accent' | 'gold';
}
