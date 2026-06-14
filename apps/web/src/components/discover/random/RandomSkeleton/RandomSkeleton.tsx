import { useRandomSkeleton } from './RandomSkeleton.hooks';

export default function RandomSkeleton() {
  useRandomSkeleton();

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 p-5 md:p-7 rounded-[14px] border border-border-glass bg-card/40">
      <div className="aspect-[2/3] w-full max-w-[220px] mx-auto md:max-w-none rounded-[12px] bg-muted/40 animate-pulse" />
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-4 w-14 rounded-[4px] bg-muted/40 animate-pulse" />
          <div className="h-4 w-16 rounded-[4px] bg-muted/40 animate-pulse" />
          <div className="h-4 w-12 rounded-[4px] bg-muted/40 animate-pulse" />
        </div>
        <div className="h-7 w-3/4 rounded bg-muted/40 animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-muted/30 animate-pulse" />
        <div className="flex gap-2 pt-1">
          <div className="h-4 w-16 rounded-full bg-muted/30 animate-pulse" />
          <div className="h-4 w-14 rounded-full bg-muted/30 animate-pulse" />
          <div className="h-4 w-20 rounded-full bg-muted/30 animate-pulse" />
        </div>
        <div className="space-y-1.5 pt-2">
          <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-full rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-muted/30 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
