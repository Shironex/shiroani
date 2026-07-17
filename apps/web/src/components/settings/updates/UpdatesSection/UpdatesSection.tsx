import { useTranslation, Trans } from 'react-i18next';
import { AlertTriangle, Download, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatusPill } from '@/components/settings/updates/StatusPill';
import { ChannelButton } from '@/components/settings/updates/ChannelButton';
import { LatestReleaseHighlights } from '@/components/settings/updates/LatestReleaseHighlights';
import { useUpdatesSection } from './UpdatesSection.hooks';

export default function UpdatesSection() {
  const { t } = useTranslation('settings');
  const {
    version,
    status,
    updateInfo,
    progress,
    channel,
    isChannelSwitching,
    isMac,
    statusText,
    statusTone,
    updateLocked,
    lastCheckedLabel,
    checkForUpdates,
    startDownload,
    installNow,
    setChannel,
    openReleasesPage,
  } = useUpdatesSection();

  const showDownloadProgress = status === 'downloading' && !!progress;

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
              {version || '…'}
            </p>
            <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
              {channel === 'beta' ? t('updates.channelBetaUpper') : t('updates.channelStableUpper')}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <StatusPill tone={statusTone} text={statusText} />
            {lastCheckedLabel && (
              <p className="font-mono text-[10px] text-muted-foreground/85">
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
              <p className="mt-2 text-[11.5px] text-muted-foreground/85 leading-relaxed">
                {t('updates.channelLockedNote')}
              </p>
            ) : (
              <p className="mt-2 text-[11.5px] text-muted-foreground/85 leading-relaxed">
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
            {showDownloadProgress && (
              <ProgressBar
                className="mt-2"
                value={progress?.percent ?? 0}
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
