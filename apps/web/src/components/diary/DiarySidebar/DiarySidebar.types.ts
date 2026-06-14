import type { TFunction } from 'i18next';
import type { DiaryEntry, UserProfile } from '@shiroani/shared';

export interface IDiarySidebarProps {
  entries: DiaryEntry[];
}

export interface IDiaryStats {
  total: number;
  thisMonth: number;
  currentStreak: number;
  longestStreak: number;
  linkedToAnime: number;
  topTags: { tag: string; count: number }[];
  activeDaysByWeekOfYear: number[]; // 53 weeks, count per week
  maxWeekCount: number;
}

export interface IStreakMilestone {
  target: number;
  progress: number;
}

export interface IDiarySidebarView {
  readonly t: TFunction<'diary'>;
  readonly stats: IDiaryStats;
  readonly milestone: IStreakMilestone;
  readonly achievedMilestone: number | undefined;
  readonly failedCount: number;
  readonly retryFailedDetails: () => void;
  readonly genres: UserProfile['statistics']['genres'];
  readonly studios: UserProfile['statistics']['studios'];
}
