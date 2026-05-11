import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AnimeEvents, createLogger } from '@shiroani/shared';
import type { UserProfile } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';
import i18n from '@/lib/i18n';

const logger = createLogger('ProfileStore');

const STORE_KEY = 'anilist-username';
const STALE_MS = 30 * 60 * 1000; // 30 minutes

interface ProfileState {
  username: string;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
}

interface ProfileActions {
  setUsername: (username: string) => void;
  fetchProfile: () => void;
  clearProfile: () => void;
  initFromStore: () => void;
}

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>()(
  devtools(
    (set, get) => ({
      username: '',
      profile: null,
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
          set({ profile: null, lastFetchedAt: null }, undefined, 'profile/cleared');
        }
      },

      fetchProfile: () => {
        const { username } = get();
        if (!username) return;

        logger.info(`Fetching AniList profile for "${username}"`);
        set({ isLoading: true, error: null }, undefined, 'profile/fetching');

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

      clearProfile: () => {
        set(
          { username: '', profile: null, isLoading: false, error: null, lastFetchedAt: null },
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
      const { username, lastFetchedAt, isLoading } = useProfileStore.getState();
      if (username && lastFetchedAt && !isLoading && Date.now() - lastFetchedAt > STALE_MS) {
        logger.info('Background refresh: profile data is stale');
        useProfileStore.getState().fetchProfile();
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
