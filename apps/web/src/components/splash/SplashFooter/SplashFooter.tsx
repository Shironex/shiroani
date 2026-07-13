import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import type { SplashVariant } from '../SplashHero';
import { useSplashFooter } from './SplashFooter.hooks';
import type { ISplashFooterProps } from './SplashFooter.types';

const DOT_TONE_CLASS: Record<SplashVariant, string> = {
  loading: 'bg-primary shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h/0.7)]',
  updating: 'bg-status-info shadow-[0_0_8px_oklch(from_var(--status-info)_l_c_h/0.7)]',
  error: 'bg-destructive shadow-[0_0_8px_oklch(from_var(--destructive)_l_c_h/0.7)]',
};

export default function SplashFooter({
  variant = 'loading',
  showSpinner,
  message,
  messageKey,
  statusText,
  progressValue,
  version,
  metaRight,
  error,
  onRetry,
  onClose,
}: ISplashFooterProps) {
  const {
    isError,
    showProgress,
    progressTone,
    structured,
    statusAction,
    statusTarget,
    metaText,
    closeLabel,
    retryLabel,
    loadingLabel,
  } = useSplashFooter({ variant, statusText, version, metaRight, error });

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 transition-opacity duration-400 ease-in',
        showSpinner ? 'opacity-100' : 'opacity-0'
      )}
      role="status"
      aria-live="polite"
    >
      {showProgress &&
        (progressValue == null ? (
          <ProgressBar
            indeterminate
            thickness={2}
            tone={progressTone}
            className="rounded-none bg-foreground/5"
          />
        ) : (
          <ProgressBar
            value={progressValue}
            thickness={2}
            tone={progressTone}
            className="rounded-none bg-foreground/5"
          />
        ))}

      <div
        className={cn(
          'flex items-center gap-4 px-6 py-4',
          'border-t border-foreground/5 bg-background/50 backdrop-blur-md',
          isError ? 'justify-center' : 'justify-between'
        )}
      >
        {isError ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {closeLabel}
            </Button>
            <Button type="button" size="sm" onClick={onRetry}>
              {retryLabel}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  'h-[7px] w-[7px] shrink-0 rounded-full',
                  DOT_TONE_CLASS[variant],
                  'animate-[splash-dot-blink_1.4s_ease-in-out_infinite]'
                )}
              />
              {structured ? (
                <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  {statusAction}
                  {statusTarget && (
                    <>
                      {' · '}
                      <b className="font-sans text-[11.5px] font-semibold normal-case tracking-normal text-foreground/90">
                        {statusTarget}
                      </b>
                    </>
                  )}
                </p>
              ) : (
                <>
                  {/* Whimsy rotates ~40x/min — decorative only, so hide it from
                      the live region and announce a single stable label below. */}
                  <p
                    key={messageKey}
                    aria-hidden="true"
                    className="truncate text-sm text-muted-foreground animate-[splash-msg-swap_0.4s_ease-out_both]"
                  >
                    {message}
                  </p>
                  <span className="sr-only">{loadingLabel}</span>
                </>
              )}
            </div>
            {metaText && (
              <span className="shrink-0 font-mono text-2xs uppercase tracking-[0.16em] text-muted-foreground/60">
                {metaText}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
