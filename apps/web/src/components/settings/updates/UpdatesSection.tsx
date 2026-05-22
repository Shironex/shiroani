import { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { AlertTriangle, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { GITHUB_RELEASES_URL, UPDATE_ERROR_RELEASE_PENDING } from '@shiroani/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useUpdateStore, isUpdateLocked } from '@/stores/useUpdateStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { formatMB, formatRelativeTime } from '@/components/settings/updates/update-format';
import { StatusPill, type StatusTone } from '@/components/settings/updates/StatusPill';
import { ChannelButton } from '@/components/settings/updates/ChannelButton';
import { LatestReleaseHighlights } from '@/components/settings/updates/LatestReleaseHighlights';

export function UpdatesSection() {
  const { t, i18n } = useTranslation('settings');
  const version = useAppVersion('');
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

  const statusTone: StatusTone = (() => {
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
          </div>
        )}
      </SettingsCard>

      <LatestReleaseHighlights />
    </div>
  );
}
