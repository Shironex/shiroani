import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GITHUB_RELEASES_URL, UPDATE_ERROR_RELEASE_PENDING } from '@shiroani/shared';
import { useAppVersion } from '@/hooks/useAppVersion';
import { useUpdateStore, isUpdateLocked } from '@/stores/useUpdateStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { formatMB, formatRelativeTime } from '@/components/settings/updates/update-format';
import type { StatusTone } from '@/components/settings/updates/StatusPill';
import type { IUpdatesSectionView } from './UpdatesSection.types';

/**
 * Owns the updates section data layer: app version, the update store slice,
 * the IPC listener lifecycle, the "last checked" refresh ticker, and the
 * derived status text/tone + release-page launcher.
 */
export function useUpdatesSection(): IUpdatesSectionView {
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

  return {
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
  };
}
