import type { AnimeEntry } from '@shiroani/shared';

/** Which external provider this badge reflects. */
export type SyncProvider = 'anilist' | 'mal';

export interface ISyncBadgeProps {
  entry: Pick<AnimeEntry, 'anilistSyncedAt' | 'anilistId' | 'malSyncedAt' | 'malId'>;
  /** Which provider's sync state to render. Defaults to AniList. */
  provider?: SyncProvider;
  /** Extra classes for the badge wrapper (e.g. absolute positioning on a card). */
  className?: string;
  /** Icon size class (default `w-3.5 h-3.5`). */
  iconClassName?: string;
}

/**
 * Resolved badge state. `null` (the whole view) signals "render nothing": the
 * provider isn't connected, or the entry lacks the provider's id.
 */
export interface ISyncBadgeView {
  readonly isSynced: boolean;
  readonly tooltipLabel: string;
}
