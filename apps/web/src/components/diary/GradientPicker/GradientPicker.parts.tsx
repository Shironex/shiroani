import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(active ? undefined : key)}
                aria-label={label}
                aria-pressed={active}
                className={cn(
                  'relative h-5 w-5 shrink-0 rounded-full border',
                  'transition-[transform,border-color,box-shadow] duration-150 hover:scale-110',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary ring-2 ring-primary/30 scale-110'
                    : 'border-transparent hover:border-foreground/20'
                )}
                style={{ background: css }}
              />
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cn(
            'ml-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70',
            'transition-colors hover:text-foreground/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[2px]'
          )}
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
