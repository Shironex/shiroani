import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useDockStore } from '@/stores/useDockStore';
import {
  SettingsCard,
  SettingsRow,
  SettingsRowLabel,
  SettingsToggleRow,
} from '@/components/settings/SettingsCard';
import { DockStage } from '@/components/shared/DockStage';
import { DockEdgePicker } from '@/components/shared/DockEdgePicker';
import { useDockPreviewItems } from '@/hooks/useDockPreviewItems';

export function DockSection() {
  const { t } = useTranslation('settings');
  const dockEdge = useDockStore(s => s.edge);
  const setDockEdge = useDockStore(s => s.setEdge);
  const dockItems = useDockPreviewItems();
  const dockAutoHide = useDockStore(s => s.autoHide);
  const setDockAutoHide = useDockStore(s => s.setAutoHide);
  const dockShowLabels = useDockStore(s => s.showLabels);
  const setDockShowLabels = useDockStore(s => s.setShowLabels);
  const dockDraggable = useDockStore(s => s.draggable);
  const setDockDraggable = useDockStore(s => s.setDraggable);
  const resetDockPosition = useDockStore(s => s.resetPosition);

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={LayoutGrid}
        title={t('dock.position.title')}
        subtitle={t('dock.position.subtitle')}
      >
        <DockStage edge={dockEdge} items={dockItems} height={160} label={t('previewLabel')} />

        <SettingsRow stacked>
          <SettingsRowLabel
            title={t('dock.position.edgeTitle')}
            description={t('dock.position.edgeDescription')}
          />
          <DockEdgePicker
            value={dockEdge}
            onSelect={setDockEdge}
            getLabel={edge => t(`dock.position.edges.${edge}`)}
            ariaLabel={t('dock.position.edgeAria')}
            variant="text"
          />
        </SettingsRow>

        <SettingsRow divider>
          <SettingsRowLabel
            title={t('dock.position.resetTitle')}
            description={t('dock.position.resetDescription')}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border-glass text-xs"
            onClick={resetDockPosition}
          >
            {t('dock.position.resetAction')}
          </Button>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard
        icon={LayoutGrid}
        tone="muted"
        title={t('dock.behavior.title')}
        subtitle={t('dock.behavior.subtitle')}
      >
        <SettingsToggleRow
          id="dock-autohide-label"
          title={t('dock.behavior.autoHide.title')}
          description={t('dock.behavior.autoHide.description')}
          checked={dockAutoHide}
          onCheckedChange={setDockAutoHide}
        />
        <SettingsToggleRow
          divider
          id="dock-labels-label"
          title={t('dock.behavior.showLabels.title')}
          description={t('dock.behavior.showLabels.description')}
          checked={dockShowLabels}
          onCheckedChange={setDockShowLabels}
        />
        <SettingsToggleRow
          divider
          id="dock-draggable-label"
          title={t('dock.behavior.draggable.title')}
          description={t('dock.behavior.draggable.description')}
          checked={dockDraggable}
          onCheckedChange={setDockDraggable}
        />
      </SettingsCard>
    </div>
  );
}
