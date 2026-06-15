import type { UserProfile } from '@shiroani/shared';

export interface IProfileStatGridProps {
  profile: UserProfile;
}

export interface IProfileStatGridView {
  readonly completed: number;
  readonly current: number;
  readonly planning: number;
  readonly meanScore: string;
}
