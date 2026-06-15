import { useTranslation } from 'react-i18next';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import type { ISyncBadgeProps, ISyncBadgeView } from './SyncBadge.types';

/**
 * Both auth hooks are subscribed unconditionally (a conditional hook would
 * violate the rules of hooks) and the relevant one is selected by `provider`.
 *
 * Returns `null` when there is nothing to render — the provider's account is not
 * connected, or the entry has no provider id (so it can't be reconciled).
 */
export function useSyncBadge({
  entry,
  provider = 'anilist',
}: ISyncBadgeProps): ISyncBadgeView | null {
  const { t, i18n } = useTranslation('library');
  const anilistConnected = useAniListAuthStore(s => s.status.connected);
  const malConnected = useMalAuthStore(s => s.status.connected);

  const isMal = provider === 'mal';
  const connected = isMal ? malConnected : anilistConnected;
  const providerId = isMal ? entry.malId : entry.anilistId;
  const syncedAt = isMal ? entry.malSyncedAt : entry.anilistSyncedAt;

  if (!connected || !providerId) return null;

  const isSynced = typeof syncedAt === 'number';

  const tooltipLabel = isSynced
    ? t(`sync.${provider}.badge.synced`, {
        date: new Date(syncedAt as number).toLocaleString(i18n.language),
      })
    : t(`sync.${provider}.badge.notSynced`);

  return { isSynced, tooltipLabel };
}
