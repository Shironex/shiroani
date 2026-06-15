import type { ReactNode } from 'react';
import { type NewTabPanelId, AIRING_COUNT_MIN, AIRING_COUNT_MAX } from '@/stores/useNewTabStore';
import { cn } from '@/lib/utils';

interface MiniPanelProps {
  id: NewTabPanelId;
  showGreetingName: boolean;
  airingCount: number;
}

function MiniPanel({ id, showGreetingName, airingCount }: MiniPanelProps) {
  switch (id) {
    case 'greeting':
      return <MiniGreeting showName={showGreetingName} />;
    case 'airing':
      return <MiniAiring count={airingCount} />;
    case 'quickAccess':
      return <MiniQuickAccess />;
    case 'recents':
      return <MiniRecents />;
    case 'resume':
      return <MiniResume />;
    default:
      return null;
  }
}

const panelShell =
  'flex min-h-0 min-w-0 shrink-0 flex-col gap-1 overflow-hidden rounded-md border border-border-glass/60 bg-foreground/[0.04] p-1.5';

/**
 * Shared panel shell with a tiny header (icon chip + title bar) so each mini
 * reads like the real New Tab panels, which all carry an icon + mono heading.
 */
function MiniSection({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(panelShell, className)}>
      <div className="flex items-center gap-1">
        <span className="size-1.5 shrink-0 rounded-[2px] bg-primary/55" />
        <span className="h-1 w-8 rounded-full bg-foreground/15" />
      </div>
      {children}
    </div>
  );
}

function MiniGreeting({ showName }: { showName: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-0.5">
      <span className="size-7 shrink-0 rounded-full border border-primary/25 bg-primary/15" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-20 rounded-full bg-foreground/20" />
          {showName && <span className="h-2.5 w-12 rounded-full bg-primary/45" />}
        </div>
        <span className="h-1.5 w-28 rounded-full bg-foreground/10" />
      </div>
    </div>
  );
}

function MiniAiring({ count }: { count: number }) {
  // Map 1:1 to the count across its full range so dragging the slider visibly
  // lengthens the filmstrip; overflow-hidden clips the tail on narrow windows
  // rather than wrapping.
  const posters = Math.max(AIRING_COUNT_MIN, Math.min(count, AIRING_COUNT_MAX));
  return (
    <MiniSection>
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: posters }).map((_, i) => (
          <span
            key={i}
            className="h-[24px] w-[18px] shrink-0 rounded-[3px] bg-gradient-to-b from-foreground/25 to-foreground/[0.08] ring-1 ring-inset ring-border-glass/40"
          />
        ))}
      </div>
    </MiniSection>
  );
}

function MiniQuickAccess({ className }: { className?: string }) {
  return (
    <MiniSection className={className}>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="h-3 rounded-[3px] border border-border-glass/50 bg-foreground/[0.07]"
          />
        ))}
      </div>
    </MiniSection>
  );
}

function MiniRecents({ className }: { className?: string }) {
  return (
    <MiniSection className={className}>
      <div className="flex flex-col gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[2px] bg-foreground/15" />
            <span className="h-1.5 flex-1 rounded-full bg-foreground/12" />
          </div>
        ))}
      </div>
    </MiniSection>
  );
}

function MiniResume() {
  return (
    <MiniSection>
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[26px] w-[50px] shrink-0 flex-col justify-end overflow-hidden rounded-[4px] bg-gradient-to-br from-primary/30 to-primary/5 p-1"
          >
            <span className="h-1 w-full rounded-full bg-primary/60" />
          </div>
        ))}
      </div>
    </MiniSection>
  );
}

/**
 * Build the preview rows from the store-derived panel state. Layout mirrors
 * `NewTabPage`: Quick Access + Recents collapse into a paired two-column row
 * when both are visible and adjacent in the order; otherwise each panel is
 * full-width. Pure function so it can be called from the shell without a hook.
 */
export function buildRows({
  order,
  hiddenPanels,
  showGreetingName,
  airingCount,
}: {
  order: NewTabPanelId[];
  hiddenPanels: NewTabPanelId[];
  showGreetingName: boolean;
  airingCount: number;
}): ReactNode[] {
  const hidden = new Set(hiddenPanels);
  const visible = order.filter(id => !hidden.has(id));
  const result: ReactNode[] = [];
  for (let i = 0; i < visible.length; i++) {
    const id = visible[i];
    // Pair Quick Access + Recents into one two-column row, mirroring NewTabPage.
    if (id === 'quickAccess' && visible[i + 1] === 'recents') {
      result.push(
        <div key="qa-recents" className="flex min-h-0 gap-1.5">
          <MiniQuickAccess className="flex-[1.7]" />
          <MiniRecents className="flex-1" />
        </div>
      );
      i++; // consumed recents as part of the pair
      continue;
    }
    result.push(
      <MiniPanel key={id} id={id} showGreetingName={showGreetingName} airingCount={airingCount} />
    );
  }
  return result;
}
