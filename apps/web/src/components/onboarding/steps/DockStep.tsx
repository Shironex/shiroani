import { Trans, useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { useDockStore } from '@/stores/useDockStore';
import { DockStage } from '@/components/shared/DockStage';
import { DockEdgePicker } from '@/components/shared/DockEdgePicker';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';

/**
 * Step 04 · Navigation dock.
 *
 * Wires edge (bottom/top/left/right), auto-hide, labels and drag toggles into
 * the existing DockStore. Includes a stage preview so users see the selected
 * position before they commit to it.
 */
export function DockStep() {
  const { t } = useTranslation('onboarding');
  const edge = useDockStore(s => s.edge);
  const setEdge = useDockStore(s => s.setEdge);
  const dockItems = useDockPreviewItems();
  const autoHide = useDockStore(s => s.autoHide);
  const setAutoHide = useDockStore(s => s.setAutoHide);
  const showLabels = useDockStore(s => s.showLabels);
  const setShowLabels = useDockStore(s => s.setShowLabels);
  const draggable = useDockStore(s => s.draggable);
  const setDraggable = useDockStore(s => s.setDraggable);

  const emPrimary = <em className="not-italic text-primary italic" />;
  const bPrimary = <b className="font-bold text-primary" />;

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
      <div className="space-y-3 rounded-2xl border border-border-glass bg-foreground/[0.02] p-4">
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
