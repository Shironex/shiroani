import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/lib/i18n';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import type { IMalStepView } from './MalStep.types';

/**
 * The MAL twin of `useAniListStep`: resolves the MyAnimeList connection on mount
 * and exposes a connect action. The token is held main-side and never crosses
 * IPC — this only ever reads a {@link MalAuthStatus}. Entirely optional.
 */
export function useMalStep(): IMalStepView {
  const { i18n } = useTranslation('onboarding');
  const status = useMalAuthStore(s => s.status);
  const loading = useMalAuthStore(s => s.loading);
  const error = useMalAuthStore(s => s.error);
  const fetchStatus = useMalAuthStore(s => s.fetchStatus);
  const connect = useMalAuthStore(s => s.connect);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  // Store errors are full `namespace:key` refs (e.g. `accounts:mal.*`) so the
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
