import { useTranslation } from 'react-i18next';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useAniListSyncStore } from '@/stores/useAniListSyncStore';
import { SyncStatusWidget as SyncStatusShell } from '../shared-parts';

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
 * The presentational shell is shared with the MAL sidebar via {@link SyncStatusShell}.
 */
export function SyncStatusWidget() {
  const { t } = useTranslation('profile');
  const connected = useAniListAuthStore(s => s.status.connected);
  const syncing = useAniListSyncStore(s => s.syncing);
  const progress = useAniListSyncStore(s => s.progress);
  const error = useAniListSyncStore(s => s.error);
  const lastSyncedAt = useAniListSyncStore(s => s.lastSyncedAt);

  if (!connected) return null;

  return (
    <SyncStatusShell
      heading={t('sync.heading')}
      syncing={syncing}
      progress={progress}
      error={error}
      lastSyncedAt={lastSyncedAt}
    />
  );
}
