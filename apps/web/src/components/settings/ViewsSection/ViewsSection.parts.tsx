import { Switch } from '@/components/ui/switch';
import type { ActiveView } from '@/stores/useAppStore';
import { SortableListRow } from '@/components/shared/SortableList';
import { ALL_NAV_ITEMS } from '@/lib/nav-items';

/** Lookup of nav item metadata keyed by view id. */
export const ITEM_BY_ID = new Map(ALL_NAV_ITEMS.map(item => [item.id, item]));

export interface SortableViewRowProps {
  id: ActiveView;
  label: string;
  alwaysOn: boolean;
  visible: boolean;
  dragHandleLabel: string;
  alwaysOnLabel: string;
  onToggle: () => void;
  onHover: (hovering: boolean) => void;
}

export function SortableViewRow({
  id,
  label,
  alwaysOn,
  visible,
  dragHandleLabel,
  alwaysOnLabel,
  onToggle,
  onHover,
}: SortableViewRowProps) {
  const labelId = `view-visibility-${id}`;

  return (
    <SortableListRow
      id={id}
      dragHandleLabel={dragHandleLabel}
      onMouseEnter={() => visible && onHover(true)}
      onMouseLeave={() => onHover(false)}
      onGripFocus={() => visible && onHover(true)}
      onGripBlur={() => onHover(false)}
    >
      <span
        className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground"
        id={labelId}
      >
        {label}
        {alwaysOn && (
          <span className="ml-2 text-2xs font-normal text-muted-foreground/70">
            {alwaysOnLabel}
          </span>
        )}
      </span>
      <Switch
        checked={visible}
        disabled={alwaysOn}
        onCheckedChange={onToggle}
        aria-labelledby={labelId}
      />
    </SortableListRow>
  );
}
