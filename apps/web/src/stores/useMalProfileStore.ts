import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { MalEvents, createLogger } from '@shiroani/shared';
import type { MalUserStats } from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import i18n from '@/lib/i18n';

const logger = createLogger('MalProfileStore');

interface MalProfileState {
  /** The connected MAL viewer's thin stats, or `null` until loaded / when not connected. */
  profile: MalUserStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  /**
   * True once a fetch SETTLED with no connected account (main process found no
   * token). Distinguishes "not connected" from "not yet loaded" — without it a
   * stale connected=true auth status leaves the MAL tab on a skeleton forever.
   */
  notConnected: boolean;
}

interface MalProfileActions {
  /**
   * Fetch the connected MAL viewer's THIN profile via {@link MalEvents.GET_VIEWER_PROFILE}.
   * The access token never crosses the socket — the handler resolves the viewer
   * entirely main-side and returns only the mapped stats. Resolves with `null`
   * when no MAL account is connected (cleared quietly, NOT surfaced as an error).
   */
  fetchProfile: () => void;
  clearProfile: () => void;
}

type MalProfileStore = MalProfileState & MalProfileActions;

export const useMalProfileStore = create<MalProfileStore>()(
  maybeDevtools(
    set => ({
      profile: null,
      isLoading: false,
      error: null,
      lastFetchedAt: null,
      notConnected: false,

      fetchProfile: () => {
        logger.info('Fetching connected MAL viewer profile');
        set(
          { isLoading: true, error: null, notConnected: false },
          undefined,
          'mal-profile/fetching'
        );

        emitWithErrorHandling<Record<string, never>, { profile: MalUserStats | null }>(
          MalEvents.GET_VIEWER_PROFILE,
          {}
        )
          .then(data => {
            if (data.profile) {
              logger.info(
                `MAL profile loaded: ${data.profile.viewer.name} (${data.profile.num_items} items)`
              );
              set(
                {
                  profile: data.profile,
                  isLoading: false,
                  error: null,
                  lastFetchedAt: Date.now(),
                },
                undefined,
                'mal-profile/loaded'
              );
            } else {
              // A null profile means "not connected" (no token) — clear quietly
              // rather than surfacing it as an error.
              set(
                {
                  profile: null,
                  isLoading: false,
                  error: null,
                  lastFetchedAt: null,
                  notConnected: true,
                },
                undefined,
                'mal-profile/notConnected'
              );
            }
          })
          .catch((err: Error) => {
            logger.error('MAL profile fetch failed:', err.message);
            const msg = err.message.includes('rate limit')
              ? i18n.t('profile:errors.rateLimited')
              : err.message;
            set({ isLoading: false, error: msg }, undefined, 'mal-profile/error');
          });
      },

      clearProfile: () => {
        set(
          {
            profile: null,
            isLoading: false,
            error: null,
            lastFetchedAt: null,
            notConnected: false,
          },
          undefined,
          'mal-profile/clear'
        );
      },
    }),
    { name: 'mal-profile' }
  )
);
