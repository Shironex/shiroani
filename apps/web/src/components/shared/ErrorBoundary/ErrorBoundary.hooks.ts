import type { IErrorBoundaryView } from './ErrorBoundary.types';

/**
 * ErrorBoundary is a React class component — error boundaries require
 * `getDerivedStateFromError` / `componentDidCatch`, which have no hook
 * equivalent. This factory exists only so the component folder ships the
 * standard sibling set; the class keeps its own `this.state`.
 */
export function useErrorBoundary(): IErrorBoundaryView {
  return {};
}
