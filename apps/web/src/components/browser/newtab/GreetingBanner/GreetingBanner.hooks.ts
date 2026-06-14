import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toLocalDate } from '@shiroani/shared';
// Note: removed `pluralize` import — greeting subtitle now uses i18next CLDR plurals
// via <Trans>, which works for both PL and EN.
import { useProfileStore } from '@/stores/useProfileStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useEpisodesWaitingCount } from '@/hooks/useEpisodesWaiting';
import type { IGreetingBannerView } from './GreetingBanner.types';

export function useGreetingBanner(showName: boolean): IGreetingBannerView {
  const { t } = useTranslation('browser');
  const profile = useProfileStore(s => s.profile);
  const storedUsername = useProfileStore(s => s.username);
  const settingsDisplayName = useSettingsStore(s => s.displayName);

  // Connected AniList account — its handle/avatar personalize the banner.
  const anilistConnected = useAniListAuthStore(s => s.status.connected);
  const anilistViewer = useAniListAuthStore(s => s.status.viewer);
  const connectedViewer = anilistConnected ? anilistViewer : undefined;

  // The user's own name wins — then the connected AniList handle, then whatever
  // else AniList surfaces as a fallback.
  const displayName = (
    settingsDisplayName ||
    connectedViewer?.name ||
    profile?.name ||
    storedUsername ||
    ''
  ).trim();

  const todayKey = useMemo(() => toLocalDate(new Date()), []);
  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const todayCount = todayEntries?.length ?? 0;

  const episodesWaiting = useEpisodesWaitingCount();
  const feedItems = useFeedStore(s => s.items);
  const feedLastVisitedAt = useFeedStore(s => s.lastVisitedAt);
  const unreadFeedCount = useMemo(() => {
    if (!feedItems.length) return 0;
    return feedItems.reduce((n, item) => {
      if (!item.publishedAt) return n;
      const ts = new Date(item.publishedAt).getTime();
      return Number.isFinite(ts) && ts > feedLastVisitedAt ? n + 1 : n;
    }, 0);
  }, [feedItems, feedLastVisitedAt]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 18) return t('newTab.greeting.morning');
    return t('newTab.greeting.evening');
  }, [t]);

  // A broken AniList avatar URL falls back to the mascot rather than a gap.
  // The avatar tracks the same `showName` preference as the greeting handle, so
  // de-personalizing the greeting reverts the mascot too.
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = showName && !avatarError ? connectedViewer?.avatar : undefined;

  // Reset the error when the source URL changes (e.g. account switch) so a stale
  // failure doesn't block a freshly-valid avatar. Keyed on the raw avatar — NOT
  // `avatarUrl`, which depends on `avatarError` and would feed back on itself.
  useEffect(() => {
    setAvatarError(false);
  }, [connectedViewer?.avatar]);

  return {
    displayName,
    greeting,
    avatarUrl,
    setAvatarError,
    episodesWaiting,
    unreadFeedCount,
    todayCount,
  };
}
