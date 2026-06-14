import type { AniListViewer } from '@shiroani/shared';

export interface IAniListStepView {
  readonly connected: boolean;
  readonly viewer?: AniListViewer;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly connect: () => Promise<void>;
}
