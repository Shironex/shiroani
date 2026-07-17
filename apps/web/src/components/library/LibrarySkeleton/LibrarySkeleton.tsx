import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibrarySkeleton } from './LibrarySkeleton.hooks';
import type { ILibrarySkeletonProps } from './LibrarySkeleton.types';

/** Varied title widths for natural-looking skeletons */
const TITLE_WIDTHS = ['w-[70%]', 'w-[55%]', 'w-[80%]', 'w-[62%]', 'w-[75%]', 'w-[48%]'];

export default function LibrarySkeleton({ viewMode = 'grid' }: ILibrarySkeletonProps) {
  useLibrarySkeleton();

  if (viewMode === 'list') {
    const rows = Array.from({ length: 14 }).map((_, i) => {
      // Stagger the pulse per row. The delay must sit on the animated elements
      // (the Skeletons themselves) — on the wrapper it is a no-op.
      const delay = { animationDelay: `${i * 60}ms` };
      return (
        <div
          key={i}
          className="grid grid-cols-[44px_minmax(0,1fr)_auto_minmax(140px,1fr)_auto] items-center gap-3 px-3.5 py-2.5 rounded-md border border-transparent"
        >
          {/* Thumbnail */}
          <Skeleton className="w-11 h-14 rounded-md" style={delay} />

          {/* Title + meta */}
          <div className="min-w-0 space-y-1.5">
            <Skeleton
              className={cn('h-3 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])}
              style={delay}
            />
            <Skeleton className="h-2.5 w-[35%] rounded" style={delay} />
          </div>

          {/* Status pill */}
          <Skeleton className="h-[18px] w-16 rounded-[3px]" style={delay} />

          {/* Progress bar */}
          <Skeleton className="h-1.5 rounded-full" style={delay} />

          {/* Score */}
          <Skeleton className="h-3 w-8 rounded" style={delay} />
        </div>
      );
    });

    return (
      <div aria-busy="true" className="flex flex-col gap-0.5">
        {rows}
      </div>
    );
  }

  const cards = Array.from({ length: 14 }).map((_, i) => {
    // Stagger the pulse per card. The delay must sit on the animated elements
    // (the Skeletons themselves) — on the wrapper it is a no-op.
    const delay = { animationDelay: `${i * 60}ms` };
    return (
      <div key={i} className="rounded-lg overflow-hidden bg-card/50 border border-border-glass">
        {/* Cover placeholder — 2:3 */}
        <div className="relative aspect-[2/3]">
          <Skeleton className="absolute inset-0 rounded-none" style={delay} />

          {/* Status pill */}
          <div className="absolute top-2 left-2">
            <Skeleton className="h-[18px] w-14 rounded-[3px]" style={delay} />
          </div>

          {/* Score chip */}
          <div className="absolute top-2 right-2">
            <Skeleton className="h-[18px] w-10 rounded-[3px]" style={delay} />
          </div>

          {/* Title area at bottom */}
          <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8 space-y-1.5">
            <Skeleton
              className={cn('h-3 rounded', TITLE_WIDTHS[i % TITLE_WIDTHS.length])}
              style={delay}
            />
            <Skeleton className="h-2.5 w-[40%] rounded" style={delay} />
          </div>

          {/* Progress line */}
          <div className="absolute inset-x-0 bottom-0 h-[3px]">
            <Skeleton
              className="h-full rounded-none"
              style={{ width: `${25 + ((i * 13) % 70)}%`, ...delay }}
            />
          </div>
        </div>
      </div>
    );
  });

  return (
    <div aria-busy="true" className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
      {cards}
    </div>
  );
}
