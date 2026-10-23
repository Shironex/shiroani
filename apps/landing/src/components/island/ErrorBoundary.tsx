import { Component, type ReactNode } from 'react';

interface Props {
  /** Shown in place of the children once they throw. */
  fallback: ReactNode;
  onError?: (error: unknown) => void;
  children: ReactNode;
}

/** Swaps in `fallback` when anything below throws. No three.js imports. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
