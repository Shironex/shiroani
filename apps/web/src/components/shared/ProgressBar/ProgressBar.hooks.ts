import type { IProgressBarView, ProgressBarTone } from './ProgressBar.types';

interface IUseProgressBarArgs {
  value: number;
  tone: ProgressBarTone;
}

export function useProgressBar({ value, tone }: IUseProgressBarArgs): IProgressBarView {
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass =
    tone === 'primary'
      ? 'bg-primary'
      : tone === 'info'
        ? 'bg-[var(--status-info)]'
        : 'bg-muted-foreground/60';
  const toneVar =
    tone === 'primary' ? '--primary' : tone === 'info' ? '--status-info' : '--muted-foreground';

  return { clamped, fillClass, toneVar };
}
