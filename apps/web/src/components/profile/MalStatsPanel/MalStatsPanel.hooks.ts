import { useEffect } from 'react';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import type { IMalStatsPanelView } from './MalStatsPanel.types';

export function useMalStatsPanel(): IMalStatsPanelView {
  const profile = useMalProfileStore(s => s.profile);
  const isLoading = useMalProfileStore(s => s.isLoading);
  const error = useMalProfileStore(s => s.error);
  const notConnected = useMalProfileStore(s => s.notConnected);
  const fetchProfile = useMalProfileStore(s => s.fetchProfile);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // The fetch settled with no token main-side — the renderer's connected=true
  // was stale. Re-resolve the auth status so the MAL tab vanishes and
  // ProfileView falls back to the AniList tab on its own.
  useEffect(() => {
    if (notConnected) void useMalAuthStore.getState().fetchStatus();
  }, [notConnected]);

  return { profile, isLoading, error, notConnected, fetchProfile };
}
