import type { NewTabPanelId } from '@/stores/useNewTabStore';
import { Switch } from '@/components/ui/switch';
import { SortableListRow } from '@/components/shared/SortableList';

interface SortablePanelRowProps {
  id: NewTabPanelId;
  label: string;
  visible: boolean;
  dragHandleLabel: string;
  onToggle: () => void;
}

export function SortablePanelRow({
  id,
  label,
  visible,
  dragHandleLabel,
  onToggle,
}: SortablePanelRowProps) {
  const labelId = `newtab-panel-${id}`;

  return (
    <SortableListRow id={id} dragHandleLabel={dragHandleLabel}>
      <span
        className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground"
        id={labelId}
      >
        {label}
      </span>
      <Switch checked={visible} onCheckedChange={onToggle} aria-labelledby={labelId} />
    </SortableListRow>
  );
}
