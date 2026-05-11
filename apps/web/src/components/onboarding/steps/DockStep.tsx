import { Trans, useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { StepLayout } from '../StepLayout';
import { SettingsToggleRow } from '@/components/settings/SettingsCard';
import { cn } from '@/lib/utils';
import { useDockStore, type DockEdge } from '@/stores/useDockStore';
import { DockStage } from '@/components/shared/DockStage';
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
        <div className="grid grid-cols-4 gap-1.5">
          <EdgePill
            edge="bottom"
            current={edge}
            onSelect={setEdge}
            label={t('step.dock.edge.bottom')}
          />
          <EdgePill edge="top" current={edge} onSelect={setEdge} label={t('step.dock.edge.top')} />
          <EdgePill
            edge="left"
            current={edge}
            onSelect={setEdge}
            label={t('step.dock.edge.left')}
          />
          <EdgePill
            edge="right"
            current={edge}
            onSelect={setEdge}
            label={t('step.dock.edge.right')}
          />
        </div>
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

function EdgePill({
  edge,
  current,
  onSelect,
  label,
}: {
  edge: DockEdge;
  current: DockEdge;
  onSelect: (edge: DockEdge) => void;
  label: string;
}) {
  const active = current === edge;
  return (
    <button
      type="button"
      onClick={() => onSelect(edge)}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border px-2.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.1em] transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border-glass bg-foreground/[0.03] text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        className="relative h-[22px] w-[34px] overflow-hidden rounded-[4px] border border-border-glass bg-foreground/[0.05]"
        aria-hidden="true"
      >
        {edge === 'bottom' && (
          <span className="absolute bottom-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
        )}
        {edge === 'top' && (
          <span className="absolute top-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
        )}
        {edge === 'left' && (
          <span className="absolute left-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
        )}
        {edge === 'right' && (
          <span className="absolute right-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
        )}
      </span>
      <span className={cn('font-semibold', active && 'font-bold')}>{label}</span>
    </button>
  );
}
