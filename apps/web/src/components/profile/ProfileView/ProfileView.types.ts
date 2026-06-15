import type { Dispatch, SetStateAction } from 'react';
import type { UserProfile, MalUserStats } from '@shiroani/shared';
import type { ProfileMode } from '@/stores/useProfileStore';

export type ProfileTab = 'anilist' | 'mal' | 'app';

export type IProfileViewProps = Record<string, never>;

export interface IProfileViewView {
  readonly username: string;
  readonly profile: UserProfile | null;
  readonly mode: ProfileMode;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly connected: boolean;
  readonly malConnected: boolean;
  readonly malProfile: MalUserStats | null;
  readonly malLoading: boolean;
  readonly bootstrapped: boolean;
  readonly statsEmpty: boolean;
  readonly canShare: boolean;
  readonly isAniListTab: boolean;
  readonly subtitle: string;
  readonly tab: ProfileTab;
  readonly setTab: Dispatch<SetStateAction<ProfileTab>>;
  readonly tabOrder: ProfileTab[];
  readonly shareOpen: boolean;
  readonly setShareOpen: Dispatch<SetStateAction<boolean>>;
  readonly refresh: () => void;
  readonly fetchMalProfile: () => void;
  readonly handleDisconnect: () => void;
  readonly navigateToBrowser: (url: string) => void;
}
