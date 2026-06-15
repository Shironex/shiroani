import { cn } from '@/lib/utils';
import { useProgressBar } from './ProgressBar.hooks';
import type { IProgressBarProps } from './ProgressBar.types';

export default function ProgressBar({
  value = 0,
  thickness = 3,
  glow = false,
  tone = 'primary',
  indeterminate = false,
  className,
  style,
  'aria-label': ariaLabel,
  ...props
}: IProgressBarProps) {
  const { clamped, fillClass, toneVar, resolvedLabel } = useProgressBar({ value, tone, ariaLabel });

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-full bg-foreground/8', className)}
      style={{ height: `${thickness}px`, ...style }}
      role="progressbar"
      aria-label={resolvedLabel}
      aria-valuenow={indeterminate ? undefined : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      {indeterminate ? (
        <div
          className="h-full rounded-full animate-[progress-slide_2.2s_ease-in-out_infinite]"
          style={{
            width: '30%',
            background: `linear-gradient(90deg, transparent, oklch(from var(${toneVar}) l c h), transparent)`,
          }}
        />
      ) : (
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            fillClass,
            glow && 'shadow-[0_0_8px_oklch(from_var(--primary)_l_c_h/0.5)]'
          )}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
