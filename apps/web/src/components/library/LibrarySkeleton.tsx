import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

export function LibrarySkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[10px] overflow-hidden bg-card/50 border border-border-glass"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Cover placeholder — 2:3 */}
          <div className="relative aspect-[2/3]">
            <Skeleton className="absolute inset-0 rounded-none" />

            {/* Status pill */}
            <div className="absolute top-2 left-2">
              <Skeleton className="h-[18px] w-14 rounded-[3px]" />
            </div>

            {/* Score chip */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-[18px] w-10 rounded-[3px]" />
            </div>

            {/* Title area at bottom */}
            <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8 space-y-1.5">
              <Skeleton className={cn('h-3 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className="h-2.5 w-[40%] rounded" />
            </div>

            {/* Progress line */}
            <div className="absolute inset-x-0 bottom-0 h-[3px]">
              <Skeleton
                className="h-full rounded-none"
                style={{ width: `${25 + ((i * 13) % 70)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
