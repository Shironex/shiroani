import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import type { IAccountsSectionView } from './AccountsSection.types';

/**
 * AniList card state for {@link AccountsSection}. Reads the {@link useAniListAuthStore}
 * (status / loading / error + connect / disconnect), fetches status on mount, and
 * resolves the i18n-agnostic error key + the expiry hint against the active
 * language. The token is held main-side and never crosses IPC — this hook only
 * ever reads an {@link AniListAuthStatus} via the store.
 */
export function useAccountsSection(): IAccountsSectionView {
  const { t, i18n } = useTranslation('accounts');
  const status = useAniListAuthStore(s => s.status);
  const loading = useAniListAuthStore(s => s.loading);
  const error = useAniListAuthStore(s => s.error);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const connect = useAniListAuthStore(s => s.connect);
  const disconnect = useAniListAuthStore(s => s.disconnect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const { connected, viewer, expiresAt } = status;

  // Error keys are stored as full `namespace:key` references so the store stays
  // i18n-agnostic; resolve them here against the active language.
  const errorMessage = error ? tDynamic(i18n, error) : null;

  const expiryHint =
    connected && typeof expiresAt === 'number'
      ? t('anilist.expiresAt', { date: new Date(expiresAt).toLocaleString(i18n.language) })
      : null;

  return {
    connected,
    viewer,
    loading,
    errorMessage,
    expiryHint,
    connect,
    disconnect,
  };
}
