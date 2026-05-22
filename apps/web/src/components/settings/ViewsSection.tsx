import { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useDockStore } from '@/stores/useDockStore';
import type { ActiveView } from '@/stores/useAppStore';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
import { ALL_NAV_ITEMS, ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { DockStage } from '@/components/shared/DockStage';
import { SortableList, SortableListRow } from '@/components/shared/SortableList';
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

  // Render rows in the user-chosen order; fall back to the static list for any
  // id not yet present in `order` (defensive — initDock keeps these in sync).
  const [orderedItems, orderedIds] = useMemo(() => {
    const items = order
      .map(id => ITEM_BY_ID.get(id))
      .filter((item): item is (typeof ALL_NAV_ITEMS)[number] => item !== undefined);
    return [items, items.map(item => item.id)];
  }, [order]);

  return (
    <SettingsCard
      icon={Eye}
      title={t('settings:views.card.title')}
      subtitle={t('settings:views.card.subtitle')}
    >
      <DockStage edge={edge} items={dockItems} height={140} label={t('settings:previewLabel')} />

      <p className="text-[11.5px] leading-snug text-muted-foreground/85">
        {t('settings:views.reorderHint')}
      </p>

      <SortableList items={orderedIds} onReorder={reorderViews}>
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
      </SortableList>

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
