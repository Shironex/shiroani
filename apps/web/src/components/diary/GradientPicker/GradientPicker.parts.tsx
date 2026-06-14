import { cn } from '@/lib/utils';
import type { DiaryGradient } from '@shiroani/shared';
import type { IGradientSwatch } from './GradientPicker.types';

interface ISwatchListProps {
  swatches: IGradientSwatch[];
  value: DiaryGradient | undefined;
  onChange: (gradient: DiaryGradient | undefined) => void;
  clearLabel: string;
  stacked: boolean;
}

/** The row of gradient swatch buttons plus the optional clear control. */
export function SwatchList({ swatches, value, onChange, clearLabel, stacked }: ISwatchListProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', stacked && 'w-full')}>
      {swatches.map(({ key, label, css }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(active ? undefined : key)}
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
          {clearLabel}
        </button>
      )}
    </div>
  );
}
