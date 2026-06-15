import type { DockEdge } from '@/stores/useDockStore';

export const DOCK_EDGES: readonly DockEdge[] = ['bottom', 'top', 'left', 'right'];

/** Tiny screen illustration showing where the dock sits for the given edge. */
export function EdgeGlyph({ edge }: { edge: DockEdge }) {
  return (
    <span
      className="relative h-[22px] w-[34px] overflow-hidden rounded-[4px] border border-border-glass bg-foreground/[0.05]"
      aria-hidden="true"
    >
      {edge === 'bottom' && (
        <span className="absolute bottom-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
      )}
      {edge === 'top' && (
        <span className="absolute top-0.5 left-1/2 block h-1 w-5 -translate-x-1/2 rounded-full bg-primary" />
      )}
      {edge === 'left' && (
        <span className="absolute left-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
      )}
      {edge === 'right' && (
        <span className="absolute right-0.5 top-1/2 block h-4 w-1 -translate-y-1/2 rounded-full bg-primary" />
      )}
    </span>
  );
}
