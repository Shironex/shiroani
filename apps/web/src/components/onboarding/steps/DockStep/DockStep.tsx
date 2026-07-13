import { Trans, useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { DockStage } from '@/components/shared/DockStage';
import { DockEdgePicker } from '@/components/shared/DockEdgePicker';
import { StepLayout } from '../../StepLayout';
import { emPrimary, bPrimary } from '../../shared-parts';
import { useDockStep } from './DockStep.hooks';

/**
 * Step 04 · Navigation dock. Edge, auto-hide, labels and drag toggles wired into
 * the DockStore, with a live stage preview of the selected position.
 */
export default function DockStep() {
  const { t } = useTranslation('onboarding');
  const {
    edge,
    setEdge,
    dockItems,
    autoHide,
    setAutoHide,
    showLabels,
    setShowLabels,
    draggable,
    setDraggable,
  } = useDockStep();

  return (
    <StepLayout
      kanji="位"
      headline={
        <Trans ns="onboarding" i18nKey="step.dock.headline" components={{ 1: emPrimary }} />
      }
      description={t('step.dock.description')}
      stepMarker={<Trans ns="onboarding" i18nKey="step.dock.marker" components={{ 1: bPrimary }} />}
      stepIcon={<LayoutGrid className="h-5 w-5" />}
      stepTitle={t('step.dock.title')}
    >
      <div className="space-y-3 rounded-xl border border-border-glass bg-foreground/[0.02] p-4">
        <DockStage edge={edge} items={dockItems} />
        <DockEdgePicker
          value={edge}
          onSelect={setEdge}
          getLabel={dockEdge => t(`step.dock.edge.${dockEdge}`)}
          ariaLabel={t('step.dock.edge.ariaLabel')}
          variant="illustrated"
        />
      </div>

      <div className="flex flex-col gap-2">
        <SettingsToggleRow
          id="onb-dock-autohide"
          title={t('step.dock.autoHide.title')}
          description={t('step.dock.autoHide.description')}
          checked={autoHide}
          onCheckedChange={setAutoHide}
        />
        <SettingsToggleRow
          id="onb-dock-labels"
          title={t('step.dock.showLabels.title')}
          description={t('step.dock.showLabels.description')}
          checked={showLabels}
          onCheckedChange={setShowLabels}
        />
        <SettingsToggleRow
          id="onb-dock-drag"
          title={t('step.dock.draggable.title')}
          description={t('step.dock.draggable.description')}
          checked={draggable}
          onCheckedChange={setDraggable}
        />
      </div>
    </StepLayout>
  );
}
