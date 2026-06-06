import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimeEvents,
  createLogger,
  type AniListUser,
  type GetFollowingRequest,
  type GetFollowingResult,
  type GetFollowersRequest,
  type GetFollowersResult,
  type ToggleFollowRequest,
  type ToggleFollowResult,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { useMountedRef } from './useMountedRef';

const logger = createLogger('useSocialGraph');

interface SocialGraphState {
  following: AniListUser[];
  followers: AniListUser[];
  isLoading: boolean;
  /** i18n key (or raw message) for the last load failure, or null. */
  error: string | null;
  /** Ids of users whose follow toggle is currently in flight (button disabled). */
  pendingIds: Set<number>;
  refetch: () => void;
  /**
   * Flip the connected viewer's follow state for `userId`. Optimistic: the row's
   * `isFollowing` is flipped immediately, then reconciled with the server's
   * returned state (a `null` ack means "not connected" → rollback, never `false`).
   */
  toggleFollow: (userId: number) => void;
}

/**
 * Loads the connected AniList viewer's social graph (following + followers) via
 * {@link AnimeEvents.GET_FOLLOWING} / {@link AnimeEvents.GET_FOLLOWERS}, and
 * exposes an optimistic {@link SocialGraphState.toggleFollow}.
 *
 * Both lists are viewer-scoped: the backend resolves the viewer from the stored
 * OAuth token (which never crosses the socket) and defaults `userId` to that
 * viewer when omitted — so the hook never passes an id and only fetches while
 * connected. It clears any stale data when the connection drops.
 *
 * The backend pages at 50 entries, so the lists are the *loaded* set, not the
 * full social graph — consumers should phrase counts accordingly.
 */
export function useSocialGraph(): SocialGraphState {
  const connected = useAniListAuthStore(s => s.status.connected);
  const isMounted = useMountedRef();

  const [following, setFollowing] = useState<AniListUser[]>([]);
  const [followers, setFollowers] = useState<AniListUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  // Mirror the lists into a ref so `toggleFollow` can read the current state in
  // its event handler WITHOUT depending on `following`/`followers` — keeping its
  // identity stable so the memoized `UserRow` actually skips re-renders. (A
  // functional-updater that toggles `!isFollowing` would not be StrictMode-safe.)
  const listsRef = useRef({ following, followers });
  listsRef.current = { following, followers };

  const fetchGraph = useCallback(() => {
    if (!connected) {
      setFollowing([]);
      setFollowers([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Omit `userId` — the backend defaults it to the connected viewer.
    Promise.all([
      emitWithErrorHandling<GetFollowingRequest, GetFollowingResult>(AnimeEvents.GET_FOLLOWING, {}),
      emitWithErrorHandling<GetFollowersRequest, GetFollowersResult>(AnimeEvents.GET_FOLLOWERS, {}),
    ])
      .then(([followingRes, followersRes]) => {
        if (!isMounted()) return;
        setFollowing(followingRes.users ?? []);
        setFollowers(followersRes.users ?? []);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (!isMounted()) return;
        logger.error('Failed to load social graph:', err.message);
        setError(err.message);
        setIsLoading(false);
      });
  }, [connected, isMounted]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Apply a partial patch to whichever lists contain `userId`. A mutual appears
  // in BOTH following + followers, so toggling must keep them consistent.
  const patchUser = useCallback((userId: number, patch: Partial<AniListUser>) => {
    const apply = (list: AniListUser[]) =>
      list.map(u => (u.id === userId ? { ...u, ...patch } : u));
    setFollowing(apply);
    setFollowers(apply);
  }, []);

  const toggleFollow = useCallback(
    (userId: number) => {
      // Resolve the current state from whichever list holds the user (read via
      // the ref so this callback stays stable across list mutations).
      const { following: curFollowing, followers: curFollowers } = listsRef.current;
      const current =
        curFollowing.find(u => u.id === userId)?.isFollowing ??
        curFollowers.find(u => u.id === userId)?.isFollowing ??
        false;
      const next = !current;

      // Optimistic flip + mark in-flight.
      patchUser(userId, { isFollowing: next });
      setPendingIds(prev => {
        const set = new Set(prev);
        set.add(userId);
        return set;
      });

      const clearPending = () => {
        if (!isMounted()) return;
        setPendingIds(prev => {
          const set = new Set(prev);
          set.delete(userId);
          return set;
        });
      };

      emitWithErrorHandling<ToggleFollowRequest, ToggleFollowResult>(AnimeEvents.TOGGLE_FOLLOW, {
        userId,
      })
        .then(data => {
          if (!isMounted()) return;
          if (typeof data.isFollowing === 'boolean') {
            // Server is the source of truth — commit to the returned state.
            patchUser(userId, { isFollowing: data.isFollowing });
          } else {
            // null = not connected; roll back rather than treating it as false.
            patchUser(userId, { isFollowing: current });
          }
          clearPending();
        })
        .catch((err: Error) => {
          if (!isMounted()) return;
          logger.error('Toggle follow failed:', err.message);
          patchUser(userId, { isFollowing: current });
          clearPending();
        });
    },
    [patchUser, isMounted]
  );

  return {
    following,
    followers,
    isLoading,
    error,
    pendingIds,
    refetch: fetchGraph,
    toggleFollow,
  };
}
