import type { AniListActivity } from '@shiroani/shared';

export type IActivityFeedProps = Record<string, never>;

export interface IActivityFeedView {
  readonly connected: boolean;
  readonly activities: AniListActivity[];
  readonly isLoading: boolean;
  readonly error: boolean;
  readonly refetch: () => void;
}
