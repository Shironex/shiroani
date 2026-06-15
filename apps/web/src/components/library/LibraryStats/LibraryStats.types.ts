import type { AnimeStatus } from '@shiroani/shared';

export interface ILibraryStatsData {
  readonly totalEntries: number;
  readonly totalEpisodes: number;
  readonly breakdown: Record<AnimeStatus, number>;
  readonly avgScore: number;
  readonly scoredCount: number;
}

export interface ILibraryStatsView {
  readonly stats: ILibraryStatsData;
  readonly hasEntries: boolean;
}

export type AccentType = 'primary' | 'info' | 'success' | 'warning';
