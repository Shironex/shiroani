import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[55%]', 'w-[70%]', 'w-[48%]', 'w-[62%]'];

/**
 * Loading placeholder for the diary timeline — a vertical rail with a handful
 * of entry-card shapes, mirroring `DiaryTimeline`'s layout so the view doesn't
 * flash the "create your first entry" CTA while the initial fetch is in flight.
 */
export function DiarySkeleton() {
  return (
    <div aria-busy="true" className="relative pl-6 space-y-4">
      {/* Timeline rail */}
      <div aria-hidden="true" className="absolute left-2 top-1 bottom-1 w-px bg-border-glass" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="relative" style={{ animationDelay: `${i * 80}ms` }}>
          {/* Rail dot */}
          <Skeleton className="absolute -left-[22px] top-4 size-3 rounded-full" />
          <div className="rounded-[10px] border border-border-glass bg-card/50 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className={`h-4 rounded ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`} />
              <Skeleton className="h-3 w-16 rounded shrink-0" />
            </div>
            <Skeleton className="h-3 w-[85%] rounded" />
            <Skeleton className="h-3 w-[60%] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
