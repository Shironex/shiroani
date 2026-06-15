import { cn } from '@/lib/utils';
import { useDockEdgePicker } from './DockEdgePicker.hooks';
import { DOCK_EDGES, EdgeGlyph } from './DockEdgePicker.parts';
import type { IDockEdgePickerProps } from './DockEdgePicker.types';

/**
 * Presentational dock-edge picker shared by Settings · Dock and the first-run
 * onboarding step so the two can never visually drift. Owns the radiogroup
 * semantics and active styling; each surface supplies its own labels and picks
 * a variant. Writes go straight to the caller's `onSelect` (the DockStore).
 */
export default function DockEdgePicker({
  value,
  onSelect,
  getLabel,
  ariaLabel,
  variant = 'text',
  className,
}: IDockEdgePickerProps) {
  const { registerRadio, handleKeyDown } = useDockEdgePicker({ value, onSelect });

  const radios = DOCK_EDGES.map((edge, index) => {
    const active = value === edge;
    const label = getLabel(edge);

    if (variant === 'illustrated') {
      return (
        <button
          key={edge}
          ref={registerRadio(index)}
          type="button"
          role="radio"
          aria-checked={active}
          tabIndex={active ? 0 : -1}
          onClick={() => onSelect(edge)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            active
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border-glass bg-foreground/[0.03] text-muted-foreground hover:text-foreground'
          )}
        >
          <EdgeGlyph edge={edge} />
          <span className={cn('font-semibold', active && 'font-bold')}>{label}</span>
        </button>
      );
    }

    return (
      <button
        key={edge}
        ref={registerRadio(index)}
        type="button"
        role="radio"
        aria-checked={active}
        tabIndex={active ? 0 : -1}
        onClick={() => onSelect(edge)}
        onKeyDown={handleKeyDown}
        className={cn(
          'rounded-lg border px-3 py-[7px] text-[12px] font-medium transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          active
            ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
            : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
        )}
      >
        {label}
      </button>
    );
  });

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        variant === 'illustrated'
          ? 'grid grid-cols-4 gap-1.5'
          : 'grid grid-cols-2 gap-1.5 sm:grid-cols-4',
        className
      )}
    >
      {radios}
    </div>
  );
}
