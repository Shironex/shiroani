import { Skeleton } from '@/components/ui/skeleton';

/**
 * Left rail mirroring the real 280px {@link ProfileSidebar}: a round avatar, name
 * lines, a 2×2 summary-stat grid and the pinned action buttons.
 */
export function SidebarRail() {
  return (
    <aside className="w-[280px] shrink-0 border-r border-border-glass px-5 pt-6 pb-20 flex flex-col">
      <div className="flex flex-col items-center pb-[18px] mb-4 border-b border-border-glass/60">
        <Skeleton className="w-20 h-20 rounded-full mb-2.5" />
        <Skeleton className="h-4 w-28 mb-1.5" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-24 mb-2" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-1.5 mt-auto pt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg" />
        ))}
      </div>
    </aside>
  );
}

/**
 * Main column mirroring the real dashboard: a 4-up headline stat grid, the status
 * ring row and two columns of breakdown bars.
 */
export function MainColumn() {
  return (
    <div className="flex-1 overflow-y-auto px-7 pt-6 pb-24 flex flex-col gap-5">
      {/* 4-up headline stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>

      {/* Status rings + summary column */}
      <div className="flex gap-5 items-center flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-[72px] h-[72px] rounded-full shrink-0" />
        ))}
        <div className="flex-1 min-w-[220px] space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {/* Two-column breakdown bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {[0, 1].map(col => (
          <div key={col} className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-[5px] rounded-full" style={{ width: `${90 - i * 14}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
