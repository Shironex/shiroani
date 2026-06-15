import type { UserProfile } from '@shiroani/shared';

export interface IProfileSidebarProps {
  profile: UserProfile;
  isLoading: boolean;
  onRefresh: () => void;
  onShare: () => void;
  onDisconnect: () => void;
}

export interface IProfileSidebarView {
  readonly stats: UserProfile['statistics'];
  readonly language: string;
  readonly memberSince: string | null;
  readonly daysActive: number;
  readonly daysActiveLabel: string;
}
