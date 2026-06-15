import type { MalUserStats } from '@shiroani/shared';

/** The five MAL list statuses (the `statuses` array sets display order). */
export type MalStatusKey = 'watching' | 'completed' | 'onHold' | 'dropped' | 'planToWatch';

export interface IMalStatusRow {
  key: MalStatusKey;
  count: number;
  days: number;
}

export type IMalStatsPanelProps = Record<string, never>;

export interface IMalStatsPanelView {
  readonly profile: MalUserStats | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly notConnected: boolean;
  readonly fetchProfile: () => void;
}
