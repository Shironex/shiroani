import { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GITHUB_RELEASES_URL, UPDATE_ERROR_RELEASE_PENDING } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PillTag } from '@/components/ui/pill-tag';
import { useUpdateStore, isUpdateLocked } from '@/stores/useUpdateStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { CHANGELOG_RELEASES, CHANGELOG_CATEGORY_VARIANT } from '@/lib/changelog-entries';

interface UpdatesSectionProps {
  version: string;
}

const BYTES_PER_MB = 1024 * 1024;

/** Format bytes as `X.Y MB` with 1 decimal, using a locale-aware decimal separator. */
function formatMB(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return (
      new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        0
      ) + ' MB'
    );
  }
  const value = bytes / BYTES_PER_MB;
  return (
    new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
      value
    ) + ' MB'
  );
}

/**
 * Lightweight relative-time formatter for recent events using Intl APIs.
 * Falls back to a locale-aware clock/date for events older than ~6 hours.
 */
function formatRelativeTime(
  epochMs: number | null,
  locale: string,
  justNow: string,
  todayTemplate: (time: string) => string
): string | null {
  if (!epochMs) return null;
  const now = Date.now();
  const diff = now - epochMs;
  if (diff < 0) return null;
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return justNow;
  const min = Math.floor(sec / 60);
  if (min < 1) return justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always', style: 'short' });
  if (min < 60) return rtf.format(-min, 'minute');
  const hrs = Math.floor(min / 60);
  if (hrs < 6) return rtf.format(-hrs, 'hour');
  // Older than ~6h — fall back to a clock time, prefixed with locale-aware "today" when same day.
  const then = new Date(epochMs);
  const sameDay = new Date(now).toDateString() === then.toDateString();
  const clock = then.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return sameDay ? todayTemplate(clock) : then.toLocaleDateString(locale);
}

export function UpdatesSection({ version }: UpdatesSectionProps) {
  const { t, i18n } = useTranslation('settings');
  const {
    status,
    updateInfo,
    progress,
    error,
    channel,
    isChannelSwitching,
    lastCheckedAt,
    checkForUpdates,
    startDownload,
    installNow,
    setChannel,
    initListeners,
  } = useUpdateStore();

  useEffect(() => {
    const cleanup = initListeners();
    return cleanup;
  }, [initListeners]);

  // Keep the "last checked" relative label fresh while the settings view
  // is open — cheap: re-renders once a minute only while mounted.
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!lastCheckedAt) return;
    const id = setInterval(() => setNow(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, [lastCheckedAt]);

  const locale = i18n.language;
  const justNow = t('updates.justNow');
  const todayTemplate = useMemo(() => (time: string) => t('updates.today', { time }), [t]);

  const isMac = window.electronAPI?.platform === 'darwin';

  const statusText = (() => {
    switch (status) {
      case 'idle':
        return t('updates.status.idle');
      case 'checking':
        return t('updates.status.checking');
      case 'available':
        return t('updates.status.available', { version: updateInfo?.version ?? '' });
      case 'downloading': {
        if (progress && progress.total > 0) {
          return t('updates.status.downloading', {
            transferred: formatMB(progress.transferred, locale),
            total: formatMB(progress.total, locale),
          });
        }
        return progress
          ? t('updates.status.downloadingPct', { percent: Math.round(progress.percent) })
          : t('updates.status.downloadingFallback');
      }
      case 'ready':
        return t('updates.status.ready');
      case 'awaiting-artifacts':
        return t('updates.status.awaitingArtifacts');
      case 'error': {
        if (error === UPDATE_ERROR_RELEASE_PENDING) {
          return t('updates.status.errorReleasePending');
        }
        return t('updates.status.errorPrefix', {
          message: error ?? t('updates.status.unknownError'),
        });
      }
      default:
        return '';
    }
  })();

  const statusTone: 'green' | 'accent' | 'destructive' | 'muted' = (() => {
    if (status === 'error') return 'destructive';
    if (status === 'idle') return 'green';
    if (
      status === 'available' ||
      status === 'downloading' ||
      status === 'awaiting-artifacts' ||
      status === 'ready'
    ) {
      return 'accent';
    }
    return 'muted';
  })();

  const updateLocked = isUpdateLocked(status);

  const lastCheckedLabel = formatRelativeTime(lastCheckedAt, locale, justNow, todayTemplate);

  const openReleasesPage = () => {
    if (window.electronAPI?.browser) {
      useBrowserStore.getState().openTab(GITHUB_RELEASES_URL);
    } else {
      window.open(GITHUB_RELEASES_URL, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Version + channel — editorial hero */}
      <SettingsCard
        icon={RefreshCw}
        title={t('updates.card.title')}
        subtitle={isMac ? t('updates.card.subtitleMac') : t('updates.card.subtitleStable')}
      >
        <div className="flex flex-wrap items-center gap-6 pb-3.5 border-b border-border-glass/60">
          <div>
            <p className="font-serif font-extrabold text-[44px] leading-none tracking-[-0.04em] text-foreground tabular-nums">
              {version || '...'}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
              {channel === 'beta' ? t('updates.channelBetaUpper') : t('updates.channelStableUpper')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <StatusPill tone={statusTone} text={statusText} />
            {lastCheckedLabel && (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                {t('updates.lastChecked', { label: lastCheckedLabel })}
              </p>
            )}
          </div>
        </div>

        {!isMac && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
              {t('updates.channelLabel')}
            </p>
            <div className="inline-flex items-center gap-1">
              <ChannelButton
                active={channel === 'stable'}
                disabled={isChannelSwitching || updateLocked}
                onClick={() => setChannel('stable')}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    channel === 'stable' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                {t('updates.channelStable')}
              </ChannelButton>
              <ChannelButton
                active={channel === 'beta'}
                disabled={isChannelSwitching || updateLocked}
                onClick={() => setChannel('beta')}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    channel === 'beta' ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                />
                {t('updates.channelBeta')}
              </ChannelButton>
            </div>
            {updateLocked && !isChannelSwitching ? (
              <p className="mt-2 text-[11.5px] text-muted-foreground/80 leading-relaxed">
                {t('updates.channelLockedNote')}
              </p>
            ) : (
              <p className="mt-2 text-[11.5px] text-muted-foreground/80 leading-relaxed">
                {t('updates.channelDescription')}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        {isMac ? (
          <div className="space-y-3">
            <p className="text-[12px] text-muted-foreground/85 leading-relaxed">
              {t('updates.macUnsignedNote')}
            </p>
            <Button size="sm" variant="outline" onClick={openReleasesPage}>
              <ExternalLink className="w-4 h-4" />
              {t('updates.openReleases')}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={checkForUpdates}
                disabled={status === 'checking' || status === 'downloading'}
              >
                {status === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t('updates.checkForUpdates')}
              </Button>

              {status === 'available' && (
                <Button size="sm" variant="outline" onClick={startDownload}>
                  <Download className="w-4 h-4" />
                  {t('updates.download')}
                </Button>
              )}

              {status === 'ready' && (
                <Button size="sm" variant="outline" onClick={installNow}>
                  {t('updates.installAndRestart')}
                </Button>
              )}
            </div>

            {/* Downgrade warning — shown when the available/downloaded update
                would move the user to a lower version (e.g. switching from
                beta back to stable). Tone matches --status-warning. */}
            {updateInfo?.isDowngrade && (
              <div
                role="note"
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[12px] leading-relaxed',
                  'border-[oklch(from_var(--status-warning)_l_c_h/0.35)]',
                  'bg-[oklch(from_var(--status-warning)_l_c_h/0.08)]',
                  'text-[var(--status-warning)]'
                )}
              >
                <AlertTriangle className="size-4 flex-shrink-0 mt-px" />
                <span>
                  <Trans
                    i18nKey="updates.downgradeWarning"
                    t={t}
                    components={{ 1: <b className="font-semibold" /> }}
                  />
                </span>
              </div>
            )}

            {/* Download progress */}
            {status === 'downloading' && progress && (
              <ProgressBar
                className="mt-2"
                value={progress.percent}
                thickness={6}
                aria-label={t('updates.downloadProgressAria')}
              />
            )}

            <Package className="hidden" />
          </div>
        )}
      </SettingsCard>

      {/* Historia zmian preview — pill-tagged summary of the latest release.
          Short (4 lines max) per mock L1006; full timeline lives in the
          dedicated Changelog view. */}
      <LatestReleaseHighlights />
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────

function LatestReleaseHighlights() {
  const { t } = useTranslation('settings');
  const latest = CHANGELOG_RELEASES[0];
  if (!latest) return null;

  // Flatten the release's categories into (variant, label, entry) triples,
  // cap at 4 rows (mock: 4-line preview; full list lives in Changelog view).
  const MAX_ROWS = 4;
  const rows: Array<{ variant: ReturnType<typeof variantFor>; label: string; entry: string }> = [];
  for (const cat of latest.categories) {
    for (const entry of cat.entries) {
      if (rows.length >= MAX_ROWS) break;
      rows.push({ variant: variantFor(cat.kind), label: shortLabel(cat.label, t), entry });
    }
    if (rows.length >= MAX_ROWS) break;
  }

  return (
    <SettingsCard
      icon={Sparkles}
      tone="gold"
      title={t('updates.changelogPreview.title')}
      subtitle={t('updates.changelogPreview.subtitle')}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-primary mb-2">
        v{latest.version} — {latest.date}
      </div>
      <ul className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 items-start text-[12.5px] leading-snug text-foreground/90">
        {rows.map((row, i) => (
          <li key={i} className="contents">
            <PillTag
              variant={row.variant}
              className="w-full justify-center mt-[3px] !text-[8.5px] !px-1.5 !py-[2px]"
            >
              {row.label}
            </PillTag>
            <span>{row.entry}</span>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

function variantFor(kind: keyof typeof CHANGELOG_CATEGORY_VARIANT) {
  return CHANGELOG_CATEGORY_VARIANT[kind];
}

/** Shorten category labels so the pill stays compact. */
function shortLabel(label: string, t: (key: string) => string): string {
  // The original PL labels arrive from `lib/changelog-entries`; map them to
  // localized short tags. Falls back to the raw label for non-PL inputs.
  const keyMap: Record<string, string> = {
    Nowości: 'updates.changelogPreview.shortLabels.new',
    Poprawki: 'updates.changelogPreview.shortLabels.fix',
    Dopracowania: 'updates.changelogPreview.shortLabels.polish',
    Bezpieczeństwo: 'updates.changelogPreview.shortLabels.security',
  };
  const k = keyMap[label];
  return k ? t(k) : label;
}

function StatusPill({
  tone,
  text,
}: {
  tone: 'green' | 'accent' | 'destructive' | 'muted';
  text: string;
}) {
  const toneClass = {
    green:
      'bg-[oklch(0.78_0.15_140/0.12)] border-[oklch(0.78_0.15_140/0.3)] text-[oklch(0.78_0.15_140)]',
    accent: 'bg-primary/12 border-primary/30 text-primary',
    destructive: 'bg-destructive/12 border-destructive/30 text-destructive',
    muted: 'bg-muted/15 border-border-glass text-muted-foreground',
  }[tone];

  const dotClass = {
    green: 'bg-[oklch(0.78_0.15_140)] shadow-[0_0_8px_oklch(0.78_0.15_140/0.6)]',
    accent: 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]',
    destructive: 'bg-destructive',
    muted: 'bg-muted-foreground/60',
  }[tone];

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] font-semibold',
        toneClass
      )}
    >
      <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotClass)} />
      <span className="leading-tight">{text}</span>
    </div>
  );
}

function ChannelButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-[6px] rounded-lg border text-[12px] font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        active
          ? 'border-primary/35 bg-primary/18 text-primary font-semibold'
          : 'border-border-glass bg-background/30 text-muted-foreground hover:bg-accent/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
