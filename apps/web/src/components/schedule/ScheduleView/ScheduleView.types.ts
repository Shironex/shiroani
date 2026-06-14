import type { Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { AiringAnime } from '@shiroani/shared';
import type { ScheduleSort } from '@/stores/useScheduleStore';

/** ScheduleView takes no props — it reads everything from the stores. */
export type IScheduleViewProps = Record<string, never>;

/** View mode for the schedule (mirrors the store's `viewMode`). */
export type ScheduleMode = 'daily' | 'weekly' | 'timetable';

/** One view-mode tab descriptor with its resolved label/tooltip + icon. */
export interface IModeDef {
  id: ScheduleMode;
  label: string;
  tooltip: string;
  Icon: LucideIcon;
}

/**
 * Everything the shell + presentational parts consume from `useScheduleView`.
 * The hook owns all store reads, memos, callbacks and the mount effect; the
 * shell is a thin presentational layer that also calls `useTranslation` for the
 * remaining inline string literals in its JSX.
 */
export interface IScheduleViewView {
  // State
  readonly selectedDay: string;
  readonly viewMode: ScheduleMode;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onlyInLibrary: boolean;
  readonly sort: ScheduleSort;

  // Pre-resolved display strings
  readonly summary: string;
  readonly headingTitle: string;
  readonly previousAria: string;
  readonly nextAria: string;

  // Derived data
  readonly trackedTodayCount: number;
  readonly MODES: IModeDef[];
  readonly schedule: Record<string, AiringAnime[]>;
  readonly todayEntries: AiringAnime[];
  readonly weekDays: string[];
  readonly getFilteredEntriesForDay: (day: string) => AiringAnime[];
  readonly libraryAnilistIds: ReadonlySet<number>;
  readonly subscribedAnilistIds: ReadonlySet<number>;

  // Dialog
  readonly selectedAnime: AiringAnime | null;
  readonly infoDialogOpen: boolean;
  readonly setInfoDialogOpen: Dispatch<SetStateAction<boolean>>;
  readonly handleAnimeClick: (anime: AiringAnime) => void;

  // Navigation
  readonly navigatePrevious: () => void;
  readonly navigateNext: () => void;
  readonly navigateToday: () => void;
  readonly handleRetry: () => void;

  // Store action refs (called directly from JSX)
  readonly setViewMode: (mode: ScheduleMode) => void;
  readonly toggleLibraryFilter: () => void;
  readonly setSort: (sort: ScheduleSort) => void;
}
