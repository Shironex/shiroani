import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { AnimeEvents, createLogger } from '@shiroani/shared';
import type { UserProfile } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';
import i18n from '@/lib/i18n';

const logger = createLogger('ProfileStore');

const STORE_KEY = 'anilist-username';
const STALE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Which source the currently-loaded profile came from:
 *  - `'viewer'` — the connected account's OWN profile (authed `GET_VIEWER_PROFILE`,
 *    includes private statistics; resolved main-side via the OAuth token, so no
 *    username is involved).
 *  - `'public'` — a public profile fetched by username (`GET_USER_PROFILE`).
 *  - `null`     — nothing loaded yet.
 */
export type ProfileMode = 'viewer' | 'public' | null;

interface ProfileState {
  username: string;
  profile: UserProfile | null;
  mode: ProfileMode;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

interface ProfileActions {
  setUsername: (username: string) => void;
  /** Fetch a public profile by the stored username. No-op without a username. */
  fetchProfile: () => void;
  /** Fetch the connected viewer's OWN profile (private stats) via the token. */
  fetchViewerProfile: () => void;
  /** Re-fetch whatever is loaded, honouring the current {@link ProfileMode}. */
  refresh: () => void;
  clearProfile: () => void;
  initFromStore: () => void;
}

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>()(
  maybeDevtools(
    (set, get) => ({
      username: '',
      profile: null,
      mode: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,

      setUsername: (username: string) => {
        const trimmed = username.trim();
        set({ username: trimmed, error: null }, undefined, 'profile/setUsername');
        void electronStoreSet(STORE_KEY, trimmed);

        if (trimmed) {
          get().fetchProfile();
        } else {
          set({ profile: null, mode: null, lastFetchedAt: null }, undefined, 'profile/cleared');
        }
      },

      fetchProfile: () => {
        const { username } = get();
        if (!username) return;

        logger.info(`Fetching AniList profile for "${username}"`);
        set({ isLoading: true, mode: 'public', error: null }, undefined, 'profile/fetching');

        emitWithErrorHandling<{ username: string }, { profile: UserProfile | null }>(
          AnimeEvents.GET_USER_PROFILE,
          { username }
        )
          .then(data => {
            if (data.profile) {
              logger.info(
                `Profile loaded: ${data.profile.name} (${data.profile.statistics.count} anime, ${data.profile.statistics.episodesWatched} eps)`
              );
              set(
                {
                  profile: data.profile,
                  mode: 'public',
                  isLoading: false,
                  error: null,
                  lastFetchedAt: Date.now(),
                },
                undefined,
                'profile/loaded'
              );
            } else {
              set(
                {
                  profile: null,
                  isLoading: false,
                  error: i18n.t('profile:errors.userNotFound'),
                },
                undefined,
                'profile/notFound'
              );
            }
          })
          .catch((err: Error) => {
            logger.error('Profile fetch failed:', err.message);
            const msg = err.message.includes('rate limit')
              ? i18n.t('profile:errors.rateLimited')
              : err.message;
            set({ isLoading: false, error: msg }, undefined, 'profile/error');
          });
      },

      fetchViewerProfile: () => {
        logger.info('Fetching connected viewer profile');
        set({ isLoading: true, mode: 'viewer', error: null }, undefined, 'profile/fetchingViewer');

        // The access token never crosses the socket — the handler resolves the
        // viewer entirely main-side and returns only the mapped profile.
        emitWithErrorHandling<Record<string, never>, { profile: UserProfile | null }>(
          AnimeEvents.GET_VIEWER_PROFILE,
          {}
        )
          .then(data => {
            if (data.profile) {
              logger.info(
                `Viewer profile loaded: ${data.profile.name} (${data.profile.statistics.count} anime)`
              );
              set(
                {
                  profile: data.profile,
                  mode: 'viewer',
                  // Mirror the viewer name into `username` so the share dialog,
                  // header subtitle and any username-keyed UI stay consistent.
                  username: data.profile.name,
                  isLoading: false,
                  error: null,
                  lastFetchedAt: Date.now(),
                },
                undefined,
                'profile/viewerLoaded'
              );
            } else {
              // A null viewer means "not connected" (no token), NOT "user not
              // found" — clear quietly rather than surfacing the public error.
              set(
                { profile: null, isLoading: false, error: null, lastFetchedAt: null },
                undefined,
                'profile/viewerNotConnected'
              );
            }
          })
          .catch((err: Error) => {
            logger.error('Viewer profile fetch failed:', err.message);
            const msg = err.message.includes('rate limit')
              ? i18n.t('profile:errors.rateLimited')
              : err.message;
            set({ isLoading: false, error: msg }, undefined, 'profile/viewerError');
          });
      },

      refresh: () => {
        // Branch on the loaded source so the header button, sidebar action and
        // background interval all re-fetch the right thing (a viewer profile has
        // no username to drive `fetchProfile`).
        if (get().mode === 'viewer') {
          get().fetchViewerProfile();
        } else {
          get().fetchProfile();
        }
      },

      clearProfile: () => {
        set(
          {
            username: '',
            profile: null,
            mode: null,
            isLoading: false,
            error: null,
            lastFetchedAt: null,
          },
          undefined,
          'profile/clear'
        );
        void electronStoreSet(STORE_KEY, '');
      },

      initFromStore: () => {
        void electronStoreGet<string>(STORE_KEY).then(stored => {
          if (stored && stored.trim()) {
            set({ username: stored.trim() }, undefined, 'profile/restored');
            get().fetchProfile();
          }
        });
      },
    }),
    { name: 'profile' }
  )
);

// Background refresh — check staleness every 5 minutes
let refreshInterval: ReturnType<typeof setInterval> | null = null;

export function startProfileRefresh() {
  if (refreshInterval) return;
  refreshInterval = setInterval(
    () => {
      const { profile, mode, lastFetchedAt, isLoading } = useProfileStore.getState();
      // Gate on a loaded profile (works for both viewer + public mode) rather
      // than on `username`, which is empty for a freshly-fetched viewer profile.
      if (profile && mode && lastFetchedAt && !isLoading && Date.now() - lastFetchedAt > STALE_MS) {
        logger.info('Background refresh: profile data is stale');
        useProfileStore.getState().refresh();
      }
    },
    5 * 60 * 1000
  );
}

export function stopProfileRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}
