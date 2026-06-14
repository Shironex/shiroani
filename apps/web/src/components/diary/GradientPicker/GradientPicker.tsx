import { cn } from '@/lib/utils';
import { useGradientPicker } from './GradientPicker.hooks';
import { SwatchList } from './GradientPicker.parts';
import type { IGradientPickerProps } from './GradientPicker.types';

/**
 * Cover-gradient swatch picker. Restyled to match the redesign's quiet chip
 * row: mono-label eyebrow + rounded swatches with accent ring on the active
 * one. Behaviour is unchanged — selecting an already-active swatch clears it.
 */
export default function GradientPicker({
  value,
  onChange,
  stacked = false,
  className,
}: IGradientPickerProps) {
  const { eyebrow, clearLabel, swatches } = useGradientPicker();
  return (
    <div
      className={cn(
        'flex gap-2',
        stacked ? 'flex-col items-start' : 'items-center flex-wrap',
        className
      )}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </span>
      <SwatchList
        swatches={swatches}
        value={value}
        onChange={onChange}
        clearLabel={clearLabel}
        stacked={stacked}
      />
    </div>
  );
}
