import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DIARY_GRADIENTS } from '@/lib/diary-constants';
import { tDynamic } from '@/lib/i18n';
import type { DiaryGradient } from '@shiroani/shared';

interface GradientPickerProps {
  value: DiaryGradient | undefined;
  onChange: (gradient: DiaryGradient | undefined) => void;
  /** When true, stacks the swatches vertically — used in the editor sidebar. */
  stacked?: boolean;
  /** Optional className for the root container. */
  className?: string;
}

/**
 * Cover-gradient swatch picker. Restyled to match the redesign's quiet chip
 * row: mono-label eyebrow + rounded swatches with accent ring on the active
 * one. Behaviour is unchanged — selecting an already-active swatch clears it.
 */
export function GradientPicker({
  value,
  onChange,
  stacked = false,
  className,
}: GradientPickerProps) {
  const { t, i18n } = useTranslation('diary');
  return (
    <div
      className={cn(
        'flex gap-2',
        stacked ? 'flex-col items-start' : 'items-center flex-wrap',
        className
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('editor.cover')}
      </span>
      <div className={cn('flex flex-wrap gap-1.5', stacked && 'w-full')}>
        {Object.entries(DIARY_GRADIENTS).map(([key, { labelKey, css }]) => {
          const active = value === key;
          const label = tDynamic(i18n, `diary:${labelKey}`);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(active ? undefined : (key as DiaryGradient))}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                'relative h-5 w-5 shrink-0 rounded-full border transition-all duration-150',
                'hover:scale-110',
                active
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-transparent hover:border-foreground/20'
              )}
              style={{ background: css }}
            />
          );
        })}
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ml-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground/80 transition-colors"
          >
            {t('gradient.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
