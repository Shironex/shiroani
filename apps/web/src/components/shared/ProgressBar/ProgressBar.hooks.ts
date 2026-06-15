import { useTranslation } from 'react-i18next';
import type { IProgressBarView, ProgressBarTone } from './ProgressBar.types';

interface IUseProgressBarArgs {
  value: number;
  tone: ProgressBarTone;
  /** Caller-supplied accessible name; falls back to a localized generic label. */
  ariaLabel?: string;
}

export function useProgressBar({ value, tone, ariaLabel }: IUseProgressBarArgs): IProgressBarView {
  const { t } = useTranslation('common');
  const clamped = Math.max(0, Math.min(100, value));
  const fillClass =
    tone === 'primary'
      ? 'bg-primary'
      : tone === 'info'
        ? 'bg-[var(--status-info)]'
        : 'bg-muted-foreground/60';
  const toneVar =
    tone === 'primary' ? '--primary' : tone === 'info' ? '--status-info' : '--muted-foreground';

  // A `progressbar` node must expose an accessible name (axe: aria-progressbar-name).
  // Prefer a caller-supplied label; otherwise fall back to a localized generic one.
  const resolvedLabel = ariaLabel ?? t('progress', { defaultValue: 'Progress' });

  return { clamped, fillClass, toneVar, resolvedLabel };
}
