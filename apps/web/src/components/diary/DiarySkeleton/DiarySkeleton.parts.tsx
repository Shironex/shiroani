import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[55%]', 'w-[70%]', 'w-[48%]', 'w-[62%]'];

const SKELETON_ROWS = Array.from({ length: 4 }, (_, i) => i);

/** The vertical rail of entry-card placeholders shown while entries load. */
export function SkeletonRows() {
  return (
    <>
      {/* Timeline rail */}
      <div aria-hidden="true" className="absolute left-2 top-1 bottom-1 w-px bg-border-glass" />
      {SKELETON_ROWS.map(i => {
        // Stagger the pulse per row — the delay must sit on the animated
        // Skeletons, not the static wrapper (where it is a no-op).
        const delay = { animationDelay: `${i * 80}ms` };
        return (
          <div key={i} className="relative">
            {/* Rail dot */}
            <Skeleton className="absolute -left-[22px] top-4 size-3 rounded-full" style={delay} />
            <div className="rounded-lg border border-border-glass bg-card/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Skeleton
                  className={`h-4 rounded ${TITLE_WIDTHS[i % TITLE_WIDTHS.length]}`}
                  style={delay}
                />
                <Skeleton className="h-3 w-16 rounded shrink-0" style={delay} />
              </div>
              <Skeleton className="h-3 w-[85%] rounded" style={delay} />
              <Skeleton className="h-3 w-[60%] rounded" style={delay} />
            </div>
          </div>
        );
      })}
    </>
  );
}
