import type { MalViewer } from '@shiroani/shared';

export interface IMalStepView {
  readonly connected: boolean;
  readonly viewer?: MalViewer;
  readonly loading: boolean;
  readonly errorMessage: string | null;
  readonly connect: () => Promise<void>;
}
