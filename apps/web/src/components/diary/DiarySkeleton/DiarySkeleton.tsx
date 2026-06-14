import { useDiarySkeleton } from './DiarySkeleton.hooks';
import { SkeletonRows } from './DiarySkeleton.parts';

/**
 * Loading placeholder for the diary timeline — a vertical rail with a handful
 * of entry-card shapes, mirroring `DiaryTimeline`'s layout so the view doesn't
 * flash the "create your first entry" CTA while the initial fetch is in flight.
 */
export default function DiarySkeleton() {
  useDiarySkeleton();

  return (
    <div aria-busy="true" className="relative pl-6 space-y-4">
      <SkeletonRows />
    </div>
  );
}
