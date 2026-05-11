import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createLogger } from '@shiroani/shared';
import { MASCOT_SLEEP_URL } from '@/lib/constants';
import { SpinnerRing } from '@/components/ui/spinner-ring';
import { KanjiWatermark } from '@/components/shared/KanjiWatermark';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
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

/**
 * Functional fallback so the class boundary can use the i18n hook.
 * Kept colocated since it's tightly coupled to {@link ErrorBoundary}'s
 * recovery handlers.
 */
function ErrorFallback({
  error,
  onRestart,
  onReset,
}: {
  error: Error | null;
  onRestart: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation('errorBoundary');
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-background text-foreground overflow-hidden">
      {/* Dual radial glow — matches splash-v5 ambient shell. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 55% 40% at 25% 20%, var(--glow-1), transparent 60%)',
            'radial-gradient(ellipse 50% 55% at 90% 95%, oklch(from var(--destructive) l c h / 0.18), transparent 55%)',
          ].join(','),
        }}
      />

      <KanjiWatermark kanji="失" position="tr" size={320} opacity={0.04} />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <SpinnerRing size={180} tone="destructive">
          <img
            src={MASCOT_SLEEP_URL}
            alt={t('mascotAlt')}
            className="w-32 h-32 object-contain drop-shadow-lg"
            draggable={false}
          />
        </SpinnerRing>

        <div className="flex flex-col items-center gap-1.5">
          <div className="font-serif text-[32px] font-extrabold leading-none tracking-[-0.02em] text-foreground">
            Shiro<em className="italic text-destructive">Ani</em>
          </div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-destructive/85">
            {t('kicker')}
          </div>
        </div>

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('description')}</p>

        {error && (
          <details className="group max-w-md w-full text-left">
            <summary className="cursor-pointer font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground/70 hover:text-muted-foreground transition-colors select-none">
              {t('technicalDetails')}
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-muted/40 border border-border-glass text-xs text-muted-foreground overflow-auto max-h-40">
              {error.message}
            </pre>
          </details>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-[7px] border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-[11.5px] font-semibold text-foreground/85 hover:bg-foreground/10 cursor-pointer"
          >
            {t('restart')}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-[7px] bg-primary px-3.5 py-1.5 text-[11.5px] font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    </div>
  );
}
