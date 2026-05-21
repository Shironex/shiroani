import { useMemo, useCallback } from 'react';
import { LayoutDashboard, GripVertical } from 'lucide-react';
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
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  useNewTabStore,
  type NewTabPanelId,
  AIRING_COUNT_MIN,
  AIRING_COUNT_MAX,
} from '@/stores/useNewTabStore';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { NewTabPreview } from '@/components/settings/NewTabPreview';
import { cn } from '@/lib/utils';

interface SortablePanelRowProps {
  id: NewTabPanelId;
  label: string;
  visible: boolean;
  dragHandleLabel: string;
  onToggle: () => void;
}

function SortablePanelRow({
  id,
  label,
  visible,
  dragHandleLabel,
  onToggle,
}: SortablePanelRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const labelId = `newtab-panel-${id}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
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
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground"
        id={labelId}
      >
        {label}
      </span>
      <Switch checked={visible} onCheckedChange={onToggle} aria-labelledby={labelId} />
    </div>
  );
}

export function NewTabSection() {
  const { t } = useTranslation('settings');
  const order = useNewTabStore(s => s.order);
  const hiddenPanels = useNewTabStore(s => s.hiddenPanels);
  const showWatermark = useNewTabStore(s => s.showWatermark);
  const showGreetingName = useNewTabStore(s => s.showGreetingName);
  const airingCount = useNewTabStore(s => s.airingCount);
  const togglePanel = useNewTabStore(s => s.togglePanel);
  const reorderPanels = useNewTabStore(s => s.reorderPanels);
  const setShowWatermark = useNewTabStore(s => s.setShowWatermark);
  const setShowGreetingName = useNewTabStore(s => s.setShowGreetingName);
  const setAiringCount = useNewTabStore(s => s.setAiringCount);
  const resetNewTab = useNewTabStore(s => s.resetNewTab);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hidden = useMemo(() => new Set(hiddenPanels), [hiddenPanels]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderPanels(active.id as NewTabPanelId, over.id as NewTabPanelId);
      }
    },
    [reorderPanels]
  );

  return (
    <SettingsCard
      icon={LayoutDashboard}
      title={t('newtab.card.title')}
      subtitle={t('newtab.card.subtitle')}
    >
      <NewTabPreview />

      <p className="text-[11.5px] leading-snug text-muted-foreground/85">
        {t('newtab.reorderHint')}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {order.map(id => {
              const label = t(`newtab.panels.${id}`);
              return (
                <SortablePanelRow
                  key={id}
                  id={id}
                  label={label}
                  visible={!hidden.has(id)}
                  dragHandleLabel={t('newtab.dragHandleAria', { label })}
                  onToggle={() => togglePanel(id)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <SettingsToggleRow
        divider
        id="newtab-watermark-label"
        title={t('newtab.watermark.title')}
        description={t('newtab.watermark.description')}
        checked={showWatermark}
        onCheckedChange={setShowWatermark}
      />

      <SettingsToggleRow
        divider
        id="newtab-greeting-name-label"
        title={t('newtab.greetingName.title')}
        description={t('newtab.greetingName.description')}
        checked={showGreetingName}
        onCheckedChange={setShowGreetingName}
      />

      <SettingsRow divider stacked>
        <div className="flex items-center justify-between gap-4">
          <SettingsRowLabel
            title={t('newtab.airingCount.title')}
            description={t('newtab.airingCount.description')}
          />
          <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-primary">
            {airingCount}
          </span>
        </div>
        <Slider
          aria-label={t('newtab.airingCount.title')}
          value={[airingCount]}
          min={AIRING_COUNT_MIN}
          max={AIRING_COUNT_MAX}
          step={1}
          onValueChange={values => setAiringCount(values[0])}
        />
        <div className="flex justify-between font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground/70">
          <span>{AIRING_COUNT_MIN}</span>
          <span>{AIRING_COUNT_MAX}</span>
        </div>
      </SettingsRow>

      <SettingsRow divider>
        <SettingsRowLabel
          title={t('newtab.resetTitle')}
          description={t('newtab.resetDescription')}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-border-glass text-xs"
          onClick={resetNewTab}
        >
          {t('newtab.resetAction')}
        </Button>
      </SettingsRow>
    </SettingsCard>
  );
}
