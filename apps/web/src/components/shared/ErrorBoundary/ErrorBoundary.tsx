import { Component, type ErrorInfo } from 'react';
import { createLogger } from '@shiroani/shared';
import { ErrorFallback } from './ErrorBoundary.parts';
import type { IErrorBoundaryProps, IErrorBoundaryState } from './ErrorBoundary.types';

const logger = createLogger('ErrorBoundary');

function resetKeysChanged(a?: ReadonlyArray<unknown>, b?: ReadonlyArray<unknown>): boolean {
  if (a === b) return false;
  if (!a || !b || a.length !== b.length) return true;
  return a.some((value, i) => !Object.is(value, b[i]));
}

class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  state: IErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): IErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: IErrorBoundaryProps) {
    if (this.state.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error:', error.message, errorInfo.componentStack);
    // Direct IPC forward — skips the buffered periodic flush so a crash log
    // hits disk even if the renderer is about to unmount before the bridge
    // subscription next fires.
    window.electronAPI?.log
      ?.write({
        level: 'error',
        context: 'ErrorBoundary',
        message: error.message,
        data: { stack: error.stack, componentStack: errorInfo.componentStack },
      })
      .catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRestart = () => {
    // TODO: wire a proper `electronAPI.app.relaunch` IPC once exposed in the
    // preload — today the closest we can do from the renderer is a full
    // reload of the current window. This is enough to unstick most stuck
    // renderer trees without requiring the user to quit the app manually.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ErrorFallback
        error={this.state.error}
        onRestart={this.handleRestart}
        onReset={this.handleReset}
      />
    );
  }
}

export default ErrorBoundary;
