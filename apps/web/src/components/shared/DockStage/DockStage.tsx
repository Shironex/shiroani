import { PreviewStage } from '@/components/shared/PreviewStage';
import { useDockStage } from './DockStage.hooks';
import { MiniDock } from './DockStage.parts';
import type { IDockStageProps } from './DockStage.types';

/**
 * Miniature stage with a grid background + floating dock positioned by edge.
 * Reused between the onboarding DockStep, the Dock settings section, and the
 * Widoki section's visibility preview so the live preview stays consistent.
 */
export default function DockStage({
  edge,
  height = 144,
  className,
  items,
  label,
}: IDockStageProps) {
  useDockStage();

  return (
    <PreviewStage height={height} className={className} label={label}>
      <MiniDock edge={edge} items={items} />
    </PreviewStage>
  );
}
