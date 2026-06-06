import { useCallback, useEffect, useState } from 'react';
import {
  AnimeEvents,
  createLogger,
  type AniListActivity,
  type GetSocialFeedResult,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMountedRef } from './useMountedRef';

const logger = createLogger('useSocialFeed');

interface SocialFeedState {
  activities: AniListActivity[];
  isLoading: boolean;
  /** i18n key (or raw message) for the last failure, or null. */
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the social activity feed of the people the connected viewer FOLLOWS
 * via {@link AnimeEvents.GET_SOCIAL_FEED}.
 *
 * Like {@link useViewerActivity}, this feed is token-relative: the backend
 * resolves it from the stored OAuth token (which never crosses the socket), so
 * it only makes sense when an AniList account is connected. The hook gates on
 * `status.connected` — it never emits while disconnected and clears any stale
 * data when the connection drops. Consumers should surface a distinct "connect
 * AniList" prompt for the disconnected case rather than treating an empty feed
 * as "no activity".
 *
 * Unlike the own-activity feed, each returned activity carries an optional
 * `user` author (the person the viewer follows) — see {@link AniListActivity}.
 *
 * Not cached: each mount (and each `refetch`) pulls a fresh page so the feed
 * reflects the latest follow + activity state.
 */
export function useSocialFeed(): SocialFeedState {
  const connected = useAniListAuthStore(s => s.status.connected);
  const isMounted = useMountedRef();

  const [activities, setActivities] = useState<AniListActivity[]>([]);
  // Start in the loading state so the first connected render paints the skeleton
  // rather than briefly flashing the empty state before the fetch effect runs.
  // Safe for the disconnected case: the not-connected branch below resets it to
  // false, and the component checks connection before the loading branch.
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(() => {
    if (!connected) {
      setActivities([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    emitWithErrorHandling<Record<string, never>, GetSocialFeedResult>(
      AnimeEvents.GET_SOCIAL_FEED,
      {}
    )
      .then(data => {
        if (!isMounted()) return;
        setActivities(data.activities ?? []);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (!isMounted()) return;
        logger.error('Failed to load social feed:', err.message);
        setError(err.message);
        setIsLoading(false);
      });
  }, [connected, isMounted]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { activities, isLoading, error, refetch: fetchFeed };
}
