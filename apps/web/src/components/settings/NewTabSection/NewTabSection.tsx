import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { AIRING_COUNT_MIN, AIRING_COUNT_MAX } from '@/stores/useNewTabStore';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { NewTabPreview } from '@/components/settings/NewTabPreview';
import { SortableList } from '@/components/shared/SortableList';
import { useNewTabSection } from './NewTabSection.hooks';
import { SortablePanelRow } from './NewTabSection.parts';
import type { INewTabSectionProps } from './NewTabSection.types';

export default function NewTabSection(props: INewTabSectionProps) {
  const { t } = useTranslation('settings');
  const {
    order,
    hidden,
    showWatermark,
    showGreetingName,
    airingCount,
    togglePanel,
    reorderPanels,
    setShowWatermark,
    setShowGreetingName,
    setAiringCount,
    resetNewTab,
  } = useNewTabSection(props);

  const panelRows = order.map(id => {
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
  });

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
        {panelRows}
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
