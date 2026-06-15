import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SettingsCard, SettingsRow, SettingsRowLabel } from '@/components/settings/SettingsCard';
import { ALWAYS_VISIBLE_VIEWS } from '@/lib/nav-items';
import { DockStage } from '@/components/shared/DockStage';
import { SortableList } from '@/components/shared/SortableList';
import { useViewsSection } from './ViewsSection.hooks';
import { SortableViewRow } from './ViewsSection.parts';
import type { IViewsSectionProps } from './ViewsSection.types';

export default function ViewsSection(props: IViewsSectionProps) {
  const { t } = useTranslation(['settings', 'nav']);
  const {
    edge,
    hiddenViews,
    dockItems,
    orderedItems,
    orderedIds,
    setHoveredId,
    toggleViewVisibility,
    reorderViews,
    resetViews,
  } = useViewsSection(props);

  const viewRows = orderedItems.map(item => {
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
  });

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
        {viewRows}
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
