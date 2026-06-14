import type { AniListActivity } from '@shiroani/shared';

export interface ISocialViewView {
  readonly connected: boolean;
  readonly activities: AniListActivity[];
  readonly isLoading: boolean;
  /** i18n key or raw message for the last failure, or null. */
  readonly error: string | null;
  readonly onRetry: () => void;
}
