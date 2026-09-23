import type { UserProfile } from '@shiroani/shared';

type StudioStat = UserProfile['statistics']['studios'][number];

export interface IStudioBreakdownProps {
  studios: UserProfile['statistics']['studios'];
  limit?: number;
}

export interface IStudioBreakdownView {
  readonly top: StudioStat[];
}
