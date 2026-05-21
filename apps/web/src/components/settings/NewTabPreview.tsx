import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNewTabStore, type NewTabPanelId } from '@/stores/useNewTabStore';
import { cn } from '@/lib/utils';

/**
 * Miniature, deterministic preview of the browser New Tab page that reacts in
 * real time to the store: panel visibility, drag order, watermark, greeting
 * name and the airing-card count. Mirrors the gridded-gradient stage idiom of
 * `MascotPreview`/`DockStage` so the preview language stays consistent across
 * settings sections. Renders synthetic skeleton shapes — never live data — so
 * it stays cheap and predictable.
 *
 * Layout intentionally mirrors `NewTabPage`: Quick Access + Recents collapse
 * into a paired two-column row (Quick Access wider, Recents narrower) when both
 * are visible and adjacent in the order; otherwise each panel is full-width.
 */
export function NewTabPreview() {
  const { t } = useTranslation('settings');
  const order = useNewTabStore(s => s.order);
  const hiddenPanels = useNewTabStore(s => s.hiddenPanels);
  const showWatermark = useNewTabStore(s => s.showWatermark);
  const showGreetingName = useNewTabStore(s => s.showGreetingName);
  const airingCount = useNewTabStore(s => s.airingCount);

  const hidden = new Set(hiddenPanels);
  const visible = order.filter(id => !hidden.has(id));

  const rows: ReactNode[] = [];
  for (let i = 0; i < visible.length; i++) {
    const id = visible[i];
    // Pair Quick Access + Recents into one two-column row, mirroring NewTabPage.
    if (id === 'quickAccess' && visible[i + 1] === 'recents') {
      rows.push(
        <div key="qa-recents" className="flex min-h-0 gap-1.5">
          <MiniQuickAccess className="flex-[1.7]" />
          <MiniRecents className="flex-1" />
        </div>
      );
      i++; // consumed recents as part of the pair
      continue;
    }
    rows.push(
      <MiniPanel key={id} id={id} showGreetingName={showGreetingName} airingCount={airingCount} />
    );
  }

  return (
    <div
      data-testid="newtab-preview"
      className="relative h-[220px] overflow-hidden rounded-xl border border-border-glass"
      style={{
        background:
          'linear-gradient(135deg, oklch(0.14 0.02 300), oklch(0.1 0.02 280)), radial-gradient(circle at 70% 30%, oklch(0.5 0.15 355 / 0.25), transparent 60%)',
        backgroundBlendMode: 'overlay',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {showWatermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 -right-1 select-none font-serif text-[88px] font-extrabold leading-none text-foreground/[0.05]"
        >
          網
        </span>
      )}

      {visible.length === 0 ? (
        <div className="relative grid h-full place-items-center px-6">
          <p className="text-center text-[11.5px] font-medium text-muted-foreground/80">
            {t('newtab.preview.allHidden')}
          </p>
        </div>
      ) : (
        <div className="relative flex h-full flex-col gap-1.5 overflow-hidden p-3">{rows}</div>
      )}
    </div>
  );
}

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
  // Map 1:1 to the count across its full 6–20 range so dragging the slider
  // visibly lengthens the filmstrip; overflow-hidden clips the tail on narrow
  // windows rather than wrapping.
  const posters = Math.max(1, Math.min(count, 20));
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
