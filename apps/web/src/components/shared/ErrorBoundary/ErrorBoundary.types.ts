import type { ReactNode } from 'react';

export interface IErrorBoundaryProps {
  children: ReactNode;
  /**
   * When any value here changes (shallow compare) after an error, the boundary
   * clears itself. Pass `[activeView]` so navigating away from a crashed view
   * recovers automatically instead of trapping every view behind the fallback.
   */
  resetKeys?: ReadonlyArray<unknown>;
}

export interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** The class boundary owns its own `this.state`; the colocated hook is a no-op. */
export type IErrorBoundaryView = Record<string, never>;
