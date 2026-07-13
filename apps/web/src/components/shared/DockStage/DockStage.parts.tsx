import { cn } from '@/lib/utils';
import type { DockEdge } from '@/stores/useDockStore';
import type { DockStageItem } from './DockStage.types';

const PLACEHOLDER_ITEMS: DockStageItem[] = [
  { id: '0', highlighted: true },
  { id: '1' },
  { id: '2' },
  { id: '3' },
];

export function MiniDock({ edge, items }: { edge: DockEdge; items?: DockStageItem[] }) {
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
        'absolute flex gap-1 rounded-full border border-border-glass p-1 shadow-[0_10px_24px_oklch(0_0_0_/_0.5)] backdrop-blur-md',
        'transition-colors duration-200',
        isVertical ? 'flex-col' : 'flex-row'
      )}
      style={{ ...positionStyle, background: 'oklch(from var(--card) l c h / 0.85)' }}
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
