import { RefreshCw, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';

/**
 * Shared profile presentational primitives.
 *
 * These small building blocks were duplicated verbatim across the AniList
 * dashboard, the MAL panel and the in-app panel (SectionHead / StatCard /
 * SideStat / SyncStatusWidget / ConnectedBadge / CountBars). They live here so
 * the three surfaces read as one design and a token/style tweak lands once.
 */

/** Section heading with a trailing hairline rule. */
export function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground font-semibold flex items-center gap-2.5 mb-3">
      <span>{children}</span>
      <span aria-hidden="true" className="flex-1 h-px bg-border-glass" />
    </h3>
  );
}

/**
 * Headline stat tile (label + big value + optional sub-line). `size="lg"` is the
 * 4-up dashboard card; `size="md"` is the slightly smaller in-app counter card.
 */
export function StatCard({
  label,
  value,
  sub,
  tone,
  size = 'lg',
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'accent' | 'gold';
  size?: 'lg' | 'md';
}) {
  return (
    <div className="px-4 py-3.5 rounded-xl bg-foreground/[0.025] border border-border-glass">
      <div className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </div>
      <div
        className={cn(
          'font-sans font-extrabold tabular-nums',
          size === 'lg'
            ? 'text-[28px] tracking-[-0.03em] leading-none'
            : 'text-[22px] tracking-[-0.02em] leading-[1.15]',
          tone === 'accent' && 'text-primary',
          tone === 'gold' && 'text-gold',
          !tone && 'text-foreground'
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-muted-foreground/80 mt-1">{sub}</div>}
    </div>
  );
}

/** Compact 2-col summary stat used in the profile sidebars. */
export function SideStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-foreground/3 border border-border-glass">
      <div className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="font-extrabold text-[18px] tracking-[-0.02em] text-foreground leading-none tabular-nums">
        {value}
        {sub && (
          <span className="ml-1 font-mono text-2xs font-medium text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  );
}

/** "Connected" pill badge (avatar block on the profile sidebars). */
export function ConnectedBadge({ label }: { label: string }) {
  return (
    <div
      className={cn(
        'mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
        'bg-status-info-bg border border-status-info/35',
        'font-mono text-2xs tracking-[0.1em] uppercase text-status-info'
      )}
    >
      <span
        aria-hidden="true"
        className="w-[5px] h-[5px] rounded-full bg-status-info shadow-[0_0_6px_var(--status-info)]"
      />
      {label}
    </div>
  );
}

const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

export interface ICountBarRow {
  key: string;
  label: string;
  /** Right-aligned value label (e.g. "42%" or "128"). */
  valueLabel: string;
  /** Fill proportion, 0–100. */
  pct: number;
}

/**
 * Ordered horizontal-bar stack. Each row: label + value on top, a pill fill
 * underneath tinted from the categorical chart palette (cycled by index). The
 * fill animates via `scaleX` (transform, not width) so the browser can composite
 * it off the main thread.
 */
export function CountBars({ rows }: { rows: ICountBarRow[] }) {
  const bars = rows.map((row, i) => (
    <div key={row.key}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11.5px] font-medium text-foreground/90 truncate">{row.label}</span>
        <span className="font-mono text-2xs text-muted-foreground tabular-nums">
          {row.valueLabel}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-foreground/7 overflow-hidden">
        <div
          className="h-full w-full origin-left transition-transform duration-700 ease-out"
          style={{
            transform: `scaleX(${Math.max(0, Math.min(100, row.pct)) / 100})`,
            backgroundColor: CHART_VARS[i % CHART_VARS.length],
          }}
        />
      </div>
    </div>
  ));

  return <div className="flex flex-col gap-2">{bars}</div>;
}

interface ISyncProgress {
  current: number;
  total: number;
}

/**
 * Read-only sync-status widget shell, shared by the AniList and MAL sidebars.
 * Callers wire their own store selectors and pass the derived state + heading;
 * the actual sync trigger lives confirm-gated in Settings → Accounts.
 */
export function SyncStatusWidget({
  heading,
  syncing,
  progress,
  error,
  lastSyncedAt,
}: {
  heading: string;
  syncing: boolean;
  progress: ISyncProgress | null;
  error: string | null;
  lastSyncedAt: number | null;
}) {
  const { t, i18n } = useTranslation('profile');

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  let icon: React.ReactNode;
  let line: string;
  let tone: 'syncing' | 'error' | 'ok' | 'idle';

  if (syncing) {
    tone = 'syncing';
    icon = <RotateCw className="w-3 h-3 animate-spin" aria-hidden="true" />;
    line = progress
      ? t('sync.progress', { current: progress.current, total: progress.total })
      : t('sync.running');
  } else if (error) {
    tone = 'error';
    icon = <AlertCircle className="w-3 h-3" aria-hidden="true" />;
    line = tDynamic(i18n, error);
  } else if (lastSyncedAt) {
    tone = 'ok';
    icon = <CheckCircle2 className="w-3 h-3" aria-hidden="true" />;
    line = t('sync.lastSynced', {
      time: new Date(lastSyncedAt).toLocaleTimeString(i18n.language, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  } else {
    tone = 'idle';
    icon = <RefreshCw className="w-3 h-3" aria-hidden="true" />;
    line = t('sync.idle');
  }

  return (
    <div
      className={cn(
        'mb-4 px-3 py-2.5 rounded-lg border',
        tone === 'error'
          ? 'bg-destructive/[0.06] border-destructive/25'
          : 'bg-foreground/3 border-border-glass'
      )}
      aria-live={syncing ? 'off' : 'polite'}
    >
      <div className="font-mono text-2xs uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {heading}
      </div>
      <div
        className={cn(
          'flex items-center gap-1.5 text-[11.5px] leading-snug',
          tone === 'error' && 'text-destructive',
          tone === 'syncing' && 'text-primary',
          tone === 'ok' && 'text-foreground/80',
          tone === 'idle' && 'text-muted-foreground'
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 truncate">{line}</span>
      </div>
      {syncing && (
        <div className="mt-2 h-1 rounded-full bg-foreground/7 overflow-hidden">
          <div
            className={cn(
              'h-full w-full bg-primary origin-left transition-transform duration-500 ease-out',
              pct === null && 'animate-pulse'
            )}
            style={{ transform: `scaleX(${pct === null ? 1 : pct / 100})` }}
          />
        </div>
      )}
    </div>
  );
}
