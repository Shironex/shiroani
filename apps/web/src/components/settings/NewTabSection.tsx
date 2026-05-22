import { useMemo } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { SortableList, SortableListRow } from '@/components/shared/SortableList';

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

  const hidden = useMemo(() => new Set(hiddenPanels), [hiddenPanels]);

  return (
    <SettingsCard
      icon={LayoutDashboard}
      title={t('newtab.card.title')}
      subtitle={t('newtab.card.subtitle')}
    >
      <NewTabPreview label={t('previewLabel')} />

      <p className="text-[11.5px] leading-snug text-muted-foreground/85">
        {t('newtab.reorderHint')}
      </p>

      <SortableList items={order} onReorder={reorderPanels}>
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
      </SortableList>

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
