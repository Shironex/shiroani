import { RefreshCw, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { tDynamic } from '@/lib/i18n';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';

export function SideStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-foreground/3 border border-border-glass">
      <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="font-extrabold text-[18px] tracking-[-0.02em] text-foreground leading-none tabular-nums">
        {value}
        {sub && (
          <span className="ml-1 font-mono text-[10px] font-medium text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export function formatCount(n: number, locale: string): string {
  return n.toLocaleString(locale).replace(/,/g, ' ');
}

/**
 * Read-only AniList sync status widget. Surfaces the live two-way sync state
 * (running / progress / last-synced / error) sourced from the
 * {@link useAniListSyncStore} — the actual sync trigger lives, confirm-gated,
 * in Settings → Accounts (a second un-gated trigger here would be a hazard
 * since sync mutates the live AniList account).
 *
 * Rendered only when an AniList account is connected. Granular selectors keep
 * the sidebar from re-rendering on unrelated store churn. `lastSyncedAt` is
 * in-session only (null after a fresh launch), handled by the idle fallback.
 */
export function SyncStatusWidget() {
  const { t, i18n } = useTranslation('profile');
  const connected = useAniListAuthStore(s => s.status.connected);
  const syncing = useAniListSyncStore(s => s.syncing);
  const progress = useAniListSyncStore(s => s.progress);
  const error = useAniListSyncStore(s => s.error);
  const lastSyncedAt = useAniListSyncStore(s => s.lastSyncedAt);

  if (!connected) return null;

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
      <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {t('sync.heading')}
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
              'h-full rounded-full bg-primary transition-[width] duration-500 ease-out',
              pct === null && 'animate-pulse'
            )}
            style={{ width: pct === null ? '100%' : `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
