import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PreviewStage } from '@/components/shared/PreviewStage';
import type { DockEdge } from '@/stores/useDockStore';

export interface DockStageItem {
  id: string;
  /** Optional icon node rendered inside the mini-dock slot. Falls back to a small square. */
  icon?: ReactNode;
  /** When true, the slot is drawn as the active/highlighted dot. */
  highlighted?: boolean;
}

interface DockStageProps {
  edge: DockEdge;
  /** Override the stage height in px (default 144). */
  height?: number;
  className?: string;
  /**
   * Explicit list of slots to render in the mini-dock. When omitted the stage
   * falls back to a 4-dot placeholder (used by the Dock position preview).
   */
  items?: DockStageItem[];
  /**
   * Optional uppercase caption rendered above the stage (e.g. "Podgląd"). Used
   * by the settings sections; the onboarding step leaves it unset.
   */
  label?: ReactNode;
}

/**
 * Miniature stage with a grid background + floating dock positioned by edge.
 * Reused between the onboarding DockStep, the Dock settings section, and the
 * Widoki section's visibility preview so the live preview stays consistent.
 */
export function DockStage({ edge, height = 144, className, items, label }: DockStageProps) {
  return (
    <PreviewStage height={height} className={className} label={label}>
      <MiniDock edge={edge} items={items} />
    </PreviewStage>
  );
}

const PLACEHOLDER_ITEMS: DockStageItem[] = [
  { id: '0', highlighted: true },
  { id: '1' },
  { id: '2' },
  { id: '3' },
];

function MiniDock({ edge, items }: { edge: DockEdge; items?: DockStageItem[] }) {
  const isVertical = edge === 'left' || edge === 'right';
  const positionStyle: React.CSSProperties = (() => {
    switch (edge) {
      case 'bottom':
        return { bottom: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'top':
        return { top: 12, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { left: 12, top: '50%', transform: 'translateY(-50%)' };
      case 'right':
        return { right: 12, top: '50%', transform: 'translateY(-50%)' };
    }
  })();

  const slots = items && items.length > 0 ? items : PLACEHOLDER_ITEMS;

  return (
    <div
      className={cn(
        'absolute flex gap-1 rounded-full border border-white/10 p-1 shadow-[0_10px_24px_oklch(0_0_0_/_0.5)] backdrop-blur-md',
        'transition-all duration-200',
        isVertical ? 'flex-col' : 'flex-row'
      )}
      style={{ ...positionStyle, background: 'oklch(0.16 0.025 300 / 0.85)' }}
    >
      {slots.map(slot => (
        <span
          key={slot.id}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full transition-colors duration-150',
            slot.highlighted ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/80'
          )}
        >
          {slot.icon ?? (
            <span
              className={cn(
                'block h-2 w-2 rounded-[2px] bg-current',
                !slot.highlighted && 'opacity-60'
              )}
            />
          )}
        </span>
      ))}
    </div>
  );
}
