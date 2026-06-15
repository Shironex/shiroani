import type { UserProfile } from '@shiroani/shared';

export interface IProfileDashboardProps {
  profile: UserProfile;
  onShare: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}

export interface IStatusRing {
  name: string;
  color: string;
  count: number;
  pct: number;
}

export interface ITopYear {
  year: number;
  count: number;
  meanScore: number;
}

export interface IProfileDashboardView {
  readonly stats: UserProfile['statistics'];
  readonly isLoading: boolean;
  readonly statusRings: IStatusRing[];
  readonly topYear: ITopYear | null;
}
