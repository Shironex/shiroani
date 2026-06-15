import { Skeleton } from '@/components/ui/skeleton';

/** Four equal-width stat tiles for the skeleton's stats row. */
export function StatTiles() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

/** Six descending-width bars approximating the breakdown stacks. */
export function BarRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-6 rounded" style={{ width: `${80 - i * 10}%` }} />
      ))}
    </div>
  );
}
