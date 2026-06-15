import type { ReactNode } from 'react';
import type { AniListUser } from '@shiroani/shared';

export interface IProfileFollowProps {
  /** Render the shared dashboard section heading. */
  renderHead: (label: string) => ReactNode;
}

export interface IProfileFollowView {
  readonly connected: boolean;
  readonly following: AniListUser[];
  readonly followers: AniListUser[];
  readonly isLoading: boolean;
  readonly error: boolean;
  readonly pendingIds: Set<number>;
  readonly refetch: () => void;
  readonly toggleFollow: (id: number) => void;
}
