import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import type { IAniListStepView } from './AniListStep.types';

/**
 * Resolves the AniList connection on mount and exposes a connect action. The
 * token is held main-side and never crosses IPC — this only ever reads an
 * {@link AniListAuthStatus}. Entirely optional: nothing here gates the wizard.
 */
export function useAniListStep(): IAniListStepView {
  const { i18n } = useTranslation('onboarding');
  const status = useAniListAuthStore(s => s.status);
  const loading = useAniListAuthStore(s => s.loading);
  const error = useAniListAuthStore(s => s.error);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const connect = useAniListAuthStore(s => s.connect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Store errors are full `namespace:key` refs (e.g. `accounts:anilist.*`) so the
  // store stays i18n-agnostic; resolve them here against the active language.
  const errorMessage = error ? tDynamic(i18n, error) : null;

  return {
    connected: status.connected,
    viewer: status.viewer,
    loading,
    errorMessage,
    connect,
  };
}
