import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore, startProfileRefresh, stopProfileRefresh } from '@/stores/useProfileStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { useMalProfileStore } from '@/stores/useMalProfileStore';
import { useNavigateToBrowser } from '@/hooks/useNavigateToBrowser';
import type { IProfileViewView, ProfileTab } from './ProfileView.types';

/**
 * Tab order, gated on the MAL connection. The `mal` tab only exists while a MAL
 * account is connected — it is dropped entirely from the tablist (and keyboard
 * arrow cycle) otherwise, mirroring how the AniList tab body adapts to its own
 * connection state.
 */
function buildTabOrder(malConnected: boolean): ProfileTab[] {
  return malConnected ? ['anilist', 'mal', 'app'] : ['anilist', 'app'];
}

export function useProfileView(): IProfileViewView {
  const { t } = useTranslation('profile');
  const username = useProfileStore(s => s.username);
  const profile = useProfileStore(s => s.profile);
  const mode = useProfileStore(s => s.mode);
  const isLoading = useProfileStore(s => s.isLoading);
  const error = useProfileStore(s => s.error);
  const initFromStore = useProfileStore(s => s.initFromStore);
  const fetchViewerProfile = useProfileStore(s => s.fetchViewerProfile);
  const refresh = useProfileStore(s => s.refresh);
  const clearProfile = useProfileStore(s => s.clearProfile);

  const connected = useAniListAuthStore(s => s.status.connected);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const disconnect = useAniListAuthStore(s => s.disconnect);

  const malConnected = useMalAuthStore(s => s.status.connected);
  const fetchMalStatus = useMalAuthStore(s => s.fetchStatus);

  const malProfile = useMalProfileStore(s => s.profile);
  const malLoading = useMalProfileStore(s => s.isLoading);
  const fetchMalProfile = useMalProfileStore(s => s.fetchProfile);

  const navigateToBrowser = useNavigateToBrowser();

  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('anilist');
  const tabOrder = buildTabOrder(malConnected);
  // Tracks whether the initial auth-status resolution + first-profile dispatch
  // has run. Until then we show the skeleton, NOT ProfileSetup — the auth store
  // isn't persisted, so on first paint `connected` is false and `username` is
  // empty, which would otherwise flash the "connect" form for a connected user.
  const [bootstrapped, setBootstrapped] = useState(false);

  // Auth status is fetched lazily across the app (no boot-time call), so resolve
  // it BEFORE deciding viewer-vs-public. Once known: a connected account loads
  // its OWN profile (private stats, no username) via GET_VIEWER_PROFILE;
  // everyone else restores the stored public username. Awaiting status first
  // avoids a double fetch + a flash of the wrong profile when `connected`
  // resolves async.
  useEffect(() => {
    let cancelled = false;
    void fetchStatus().then(() => {
      if (cancelled) return;
      if (useAniListAuthStore.getState().status.connected) {
        fetchViewerProfile();
      } else {
        initFromStore();
      }
      setBootstrapped(true);
    });
    startProfileRefresh();
    return () => {
      cancelled = true;
      stopProfileRefresh();
    };
  }, [fetchStatus, fetchViewerProfile, initFromStore]);

  // Resolve the MAL connection lazily (no boot-time call) so the `mal` tab only
  // appears once we know an account is connected. The panel itself fetches the
  // stats on mount.
  useEffect(() => {
    void fetchMalStatus();
  }, [fetchMalStatus]);

  // If MAL disconnects while its tab is active, the tab vanishes from the
  // tablist — fall back to the always-present AniList tab so we never render a
  // panel without a matching tab.
  useEffect(() => {
    if (tab === 'mal' && !malConnected) setTab('anilist');
  }, [tab, malConnected]);

  // A connected viewer disconnects through the auth store (not `clearProfile`):
  // clearing the username while `connected` stays true would let the mount
  // effect immediately refetch, making the button look dead.
  const handleDisconnect = () => {
    if (mode === 'viewer') {
      void disconnect();
      clearProfile();
    } else {
      clearProfile();
    }
  };

  const statsEmpty = Boolean(profile && profile.statistics.count === 0);

  const subtitle =
    tab === 'app'
      ? t('view.subtitleApp')
      : tab === 'mal'
        ? t('view.subtitleMal')
        : profile
          ? t('view.subtitleAniListConnected', { handle: profile.name.toLowerCase() })
          : username
            ? t('view.subtitleAniListConnected', { handle: username.toLowerCase() })
            : t('view.subtitleAniListConnect');

  const canShare = Boolean(profile && !statsEmpty);
  const isAniListTab = tab === 'anilist';

  return {
    username,
    profile,
    mode,
    isLoading,
    error,
    connected,
    malConnected,
    malProfile,
    malLoading,
    bootstrapped,
    statsEmpty,
    canShare,
    isAniListTab,
    subtitle,
    tab,
    setTab,
    tabOrder,
    shareOpen,
    setShareOpen,
    refresh,
    fetchMalProfile,
    handleDisconnect,
    navigateToBrowser,
  };
}
