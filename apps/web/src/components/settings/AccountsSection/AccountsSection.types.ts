import type { AniListViewer } from '@shiroani/shared';

export type IAccountsSectionProps = Record<string, never>;

export interface IAccountsSectionView {
  readonly connected: boolean;
  readonly viewer: AniListViewer | undefined;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly expiryHint: string | null;
  readonly connect: () => Promise<void> | void;
  readonly disconnect: () => Promise<void> | void;
}
