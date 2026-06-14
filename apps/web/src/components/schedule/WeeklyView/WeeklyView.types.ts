import type { AiringAnime } from '@shiroani/shared';

export interface IWeeklyViewProps {
  weekDays: string[];
  getEntriesForDay: (day: string) => AiringAnime[];
  /** Raw schedule object passed through so useMemo detects changes */
  schedule: Record<string, AiringAnime[]>;
  onAnimeClick?: (anime: AiringAnime) => void;
  /**
   * AniList ids of anime present in the user's library. Cards matching one of
   * these get a primary-colour top edge + subtle wash. Library membership
   * takes precedence over subscription.
   */
  libraryAnilistIds?: ReadonlySet<number>;
  /**
   * AniList ids of anime the user has subscribed to notifications for.
   * Cards matching (and NOT in library) get a gold top edge + soft wash.
   */
  subscribedAnilistIds?: ReadonlySet<number>;
}

export interface IWeeklyViewView {
  /** Short weekday labels (e.g. "PON"), recomputed when the UI locale changes. */
  dayNamesShort: string[];
  /** Day → entries map for the week grid, keyed by YYYY-MM-DD. */
  weekData: Map<string, AiringAnime[]>;
  /** Current epoch seconds, ticking on a one-minute cadence. */
  now: number;
}
