import { Skeleton } from '@/components/ui/skeleton';

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex-1 overflow-y-auto">
      {/* Banner skeleton */}
      <div className="h-40 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
      <div className="px-6 -mt-10 space-y-6 pb-20">
        {/* Avatar + name */}
        <div className="flex items-end gap-4">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="space-y-2 pb-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        {/* Bars */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
