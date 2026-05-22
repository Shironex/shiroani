import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { DockEdge } from '@/stores/useDockStore';

const DOCK_EDGES: readonly DockEdge[] = ['bottom', 'top', 'left', 'right'];

interface DockEdgePickerProps {
  value: DockEdge;
  onSelect: (edge: DockEdge) => void;
  /** Resolves the visible label for an edge (each surface owns its i18n keys). */
  getLabel: (edge: DockEdge) => string;
  /** Accessible label for the radiogroup. */
  ariaLabel: string;
  /**
   * `text` — compact text-only radio buttons (Settings · Dock).
   * `illustrated` — pills with a mini edge-position glyph (onboarding).
   */
  variant?: 'text' | 'illustrated';
  className?: string;
}

/**
 * Presentational dock-edge picker shared by Settings · Dock and the first-run
 * onboarding step so the two can never visually drift. Owns the radiogroup
 * semantics and active styling; each surface supplies its own labels and picks
 * a variant. Writes go straight to the caller's `onSelect` (the DockStore).
 */
export function DockEdgePicker({
  value,
  onSelect,
  getLabel,
  ariaLabel,
  variant = 'text',
  className,
}: DockEdgePickerProps) {
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA APG radiogroup: arrow keys move (with wrap) the checked radio and
  // shift focus to it; Right/Down go forward, Left/Up go backward.
  function move(delta: number) {
    const currentIndex = DOCK_EDGES.indexOf(value);
    const nextIndex = (currentIndex + delta + DOCK_EDGES.length) % DOCK_EDGES.length;
    onSelect(DOCK_EDGES[nextIndex]);
    radioRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    }
  }

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
      {DOCK_EDGES.map((edge, index) => {
        const active = value === edge;
        const label = getLabel(edge);

        if (variant === 'illustrated') {
          return (
            <button
              key={edge}
              ref={el => {
                radioRefs.current[index] = el;
              }}
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
            ref={el => {
              radioRefs.current[index] = el;
            }}
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
      })}
    </div>
  );
}

/** Tiny screen illustration showing where the dock sits for the given edge. */
function EdgeGlyph({ edge }: { edge: DockEdge }) {
  return (
    <span
      className="relative h-[22px] w-[34px] overflow-hidden rounded-[4px] border border-border-glass bg-foreground/[0.05]"
      aria-hidden="true"
    >
      {edge === 'bottom' && (
        <span className="absolute bottom-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
      )}
      {edge === 'top' && (
        <span className="absolute top-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
      )}
      {edge === 'left' && (
        <span className="absolute left-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
      )}
      {edge === 'right' && (
        <span className="absolute right-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
      )}
    </span>
  );
}
