import type { ConnectionStatus } from '@shiroani/shared';

export type IConnectionBannerProps = Record<string, never>;

export interface IConnectionBannerView {
  readonly status: ConnectionStatus;
  readonly retryConnection: () => void;
}
