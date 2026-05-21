import { useState, useMemo, useCallback } from 'react';
import { Eye, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { cn } from '@/lib/utils';
import { DockStage } from '@/components/shared/DockStage';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';

const ITEM_BY_ID = new Map(ALL_NAV_ITEMS.map(item => [item.id, item]));

interface SortableViewRowProps {
  id: ActiveView;
  label: string;
  alwaysOn: boolean;
  visible: boolean;
  dragHandleLabel: string;
  alwaysOnLabel: string;
  onToggle: () => void;
  onHover: (hovering: boolean) => void;
}

function SortableViewRow({
  id,
  label,
  alwaysOn,
  visible,
  dragHandleLabel,
  alwaysOnLabel,
  onToggle,
  onHover,
}: SortableViewRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const labelId = `view-visibility-${id}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => visible && onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border-glass/70 bg-background/30 px-2.5 py-2 transition-colors duration-150 hover:border-border-glass',
        isDragging && 'relative z-10 border-border-glass shadow-lg ring-1 ring-primary/30'
      )}
    >
      <button
        type="button"
        aria-label={dragHandleLabel}
        title={dragHandleLabel}
        className={cn(
          'flex flex-shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-0.5 text-muted-foreground/50 transition-colors',
          'hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card'
        )}
        {...attributes}
        {...listeners}
        onFocus={() => visible && onHover(true)}
        onBlur={() => onHover(false)}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
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
    </div>
  );
}

export function ViewsSection() {
  const { t } = useTranslation(['settings', 'nav']);
  const edge = useDockStore(s => s.edge);
  const hiddenViews = useDockStore(s => s.hiddenViews);
  const order = useDockStore(s => s.order);
  const toggleViewVisibility = useDockStore(s => s.toggleViewVisibility);
  const reorderViews = useDockStore(s => s.reorderViews);
  const resetViews = useDockStore(s => s.resetViews);
  const [hoveredId, setHoveredId] = useState<ActiveView | null>(null);

  const dockItems = useDockPreviewItems(hoveredId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Render rows in the user-chosen order; fall back to the static list for any
  // id not yet present in `order` (defensive — initDock keeps these in sync).
  const [orderedItems, orderedIds] = useMemo(() => {
    const items = order
      .map(id => ITEM_BY_ID.get(id))
      .filter((item): item is (typeof ALL_NAV_ITEMS)[number] => item !== undefined);
    return [items, items.map(item => item.id)];
  }, [order]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderViews(active.id as ActiveView, over.id as ActiveView);
      }
    },
    [reorderViews]
  );

  return (
    <SettingsCard
      icon={Eye}
      title={t('settings:views.card.title')}
      subtitle={t('settings:views.card.subtitle')}
    >
      <DockStage edge={edge} items={dockItems} height={140} />

      <p className="text-[11.5px] leading-snug text-muted-foreground/85">
        {t('settings:views.reorderHint')}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {orderedItems.map(item => {
              const alwaysOn = ALWAYS_VISIBLE_VIEWS.has(item.id);
              const visible = alwaysOn || !hiddenViews.includes(item.id);
              const label = t(`nav:link.${item.id}`, { defaultValue: item.label });
              return (
                <SortableViewRow
                  key={item.id}
                  id={item.id}
                  label={label}
                  alwaysOn={alwaysOn}
                  visible={visible}
                  dragHandleLabel={t('settings:views.dragHandleAria', { label })}
                  alwaysOnLabel={t('settings:views.alwaysOn')}
                  onToggle={() => toggleViewVisibility(item.id)}
                  onHover={hovering =>
                    setHoveredId(prev => {
                      if (hovering) return item.id;
                      return prev === item.id ? null : prev;
                    })
                  }
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <SettingsRow divider>
        <SettingsRowLabel
          title={t('settings:views.resetTitle')}
          description={t('settings:views.resetDescription')}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-border-glass text-xs"
          onClick={resetViews}
        >
          {t('settings:views.resetAction')}
        </Button>
      </SettingsRow>
    </SettingsCard>
  );
}
