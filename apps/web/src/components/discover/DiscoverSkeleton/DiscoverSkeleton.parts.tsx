import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

const SKELETON_CARDS = Array.from({ length: 14 }, (_, i) => i);

/** The grid of placeholder cards shown while a browse/search page loads. */
export function SkeletonCards() {
  return (
    <>
      {SKELETON_CARDS.map(i => (
        <div key={i} className="rounded-lg overflow-hidden bg-card/60 border border-border-glass">
          <div className="relative aspect-[2/3]">
            <Skeleton className="absolute inset-0 rounded-none" />

            {/* Format badge */}
            <div className="absolute top-2 left-2">
              <Skeleton className="h-4 w-8 rounded-[4px]" />
            </div>

            {/* Score badge */}
            <div className="absolute top-2 right-2">
              <Skeleton className="h-4 w-10 rounded-[3px]" />
            </div>

            {/* Title area at bottom */}
            <div className="absolute inset-x-0 bottom-0 px-[10px] pt-7 pb-[10px] space-y-1.5">
              <Skeleton className={cn('h-3.5 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])} />
              <Skeleton className="h-2.5 w-[45%] rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
