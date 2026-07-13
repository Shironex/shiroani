import { Skeleton } from '@/components/ui/skeleton';
import { useRandomSkeleton } from './RandomSkeleton.hooks';

export default function RandomSkeleton() {
  useRandomSkeleton();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-5 md:p-7 rounded-xl border border-border-glass bg-card/40">
      <Skeleton className="aspect-[2/3] w-full max-w-[220px] mx-auto md:max-w-none rounded-xl" />
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14 rounded-[4px]" />
          <Skeleton className="h-4 w-16 rounded-[4px]" />
          <Skeleton className="h-4 w-12 rounded-[4px]" />
        </div>
        <Skeleton className="h-7 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <div className="space-y-1.5 pt-2">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}
