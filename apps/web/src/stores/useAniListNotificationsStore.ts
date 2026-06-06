import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import {
  AnimeEvents,
  createLogger,
  type AniListNotification,
  type GetNotificationsResult,
  type MarkNotificationsReadResult,
} from '@shiroani/shared';
import { emitWithErrorHandling } from '@/lib/socket';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';

const logger = createLogger('AniListNotificationsStore');

/**
 * Store for the connected AniList viewer's SOCIAL notifications (airing,
 * following, activity like/reply/mention, related-media) surfaced by the
 * notifications bell.
 *
 * NOTE: distinct from {@link useNotificationStore} (the local airing-reminder
 * subscription store) — this one talks to AniList over the socket, not the
 * Electron notifications bridge.
 *
 * Token-relative: every op is gated on `status.connected` (the access token
 * never crosses the socket; the backend resolves the viewer from it main-side)
 * and short-circuits when disconnected.
 */
interface AniListNotificationsState {
  notifications: AniListNotification[];
  /** Unread count — the bell badge subscribes to this granularly. */
  unreadCount: number;
  isLoading: boolean;
  /** i18n key (or raw message) for the last failure, or null. */
  error: string | null;
}

interface AniListNotificationsActions {
  /**
   * Refresh the unread count ONLY (cheap, polled on an interval). Fetches the
   * full list but keeps just the count — the list is fetched lazily on open via
   * {@link fetchNotifications}. No-op when disconnected.
   */
  refreshUnreadCount: () => Promise<void>;
  /** Fetch the full notifications list (e.g. when the panel opens). */
  fetchNotifications: () => Promise<void>;
  /**
   * Clear the unread count server-side (AniList resetNotificationCount) and
   * optimistically zero the local badge. Called when the panel opens.
   */
  markAllRead: () => Promise<void>;
}

type AniListNotificationsStore = AniListNotificationsState & AniListNotificationsActions;

function isConnected(): boolean {
  return useAniListAuthStore.getState().status.connected;
}

export const useAniListNotificationsStore = create<AniListNotificationsStore>()(
  maybeDevtools(
    set => ({
      // State
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,

      // Actions
      refreshUnreadCount: async () => {
        if (!isConnected()) {
          set({ unreadCount: 0 }, undefined, 'anilistNotif/notConnected');
          return;
        }
        try {
          const data = await emitWithErrorHandling<Record<string, never>, GetNotificationsResult>(
            AnimeEvents.GET_NOTIFICATIONS,
            {}
          );
          set({ unreadCount: data.unreadCount ?? 0 }, undefined, 'anilistNotif/unreadCount');
        } catch (err) {
          // Polling failures are silent — the badge just keeps its last value
          // rather than flashing an error the user never asked to see.
          logger.warn('Failed to refresh unread count:', (err as Error).message);
        }
      },

      fetchNotifications: async () => {
        if (!isConnected()) {
          set(
            { notifications: [], unreadCount: 0, isLoading: false, error: null },
            undefined,
            'anilistNotif/fetchNotConnected'
          );
          return;
        }
        set({ isLoading: true, error: null }, undefined, 'anilistNotif/fetch');
        try {
          const data = await emitWithErrorHandling<Record<string, never>, GetNotificationsResult>(
            AnimeEvents.GET_NOTIFICATIONS,
            {}
          );
          set(
            {
              notifications: data.notifications ?? [],
              unreadCount: data.unreadCount ?? 0,
              isLoading: false,
            },
            undefined,
            'anilistNotif/fetched'
          );
        } catch (err) {
          const message = (err as Error).message;
          logger.error('Failed to load notifications:', message);
          set({ isLoading: false, error: message }, undefined, 'anilistNotif/fetchError');
        }
      },

      markAllRead: async () => {
        if (!isConnected()) {
          set({ unreadCount: 0 }, undefined, 'anilistNotif/markNotConnected');
          return;
        }
        // Optimistically clear the badge — the server call only confirms it.
        set({ unreadCount: 0 }, undefined, 'anilistNotif/markOptimistic');
        try {
          const data = await emitWithErrorHandling<
            Record<string, never>,
            MarkNotificationsReadResult
          >(AnimeEvents.MARK_NOTIFICATIONS_READ, {});
          set({ unreadCount: data.unreadCount ?? 0 }, undefined, 'anilistNotif/marked');
        } catch (err) {
          // Non-fatal — the next poll will reconcile the real count.
          logger.warn('Failed to mark notifications read:', (err as Error).message);
        }
      },
    }),
    { name: 'anilistNotifications' }
  )
);

// ── Background unread-count polling ───────────────────────────────────────
// Mirrors useProfileStore's startProfileRefresh/stopProfileRefresh convention:
// a single module-level interval, gated on connection, started/stopped by the
// shell (the bell) on mount/unmount. Gentle 5-min cadence + a visibility gate —
// notifications aren't time-critical and AniList is rate-limited, so there's no
// point polling (and re-fetching the payload) while the window is hidden.

const POLL_INTERVAL_MS = 5 * 60 * 1000;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startNotificationsPolling() {
  if (pollInterval) return;
  // Prime immediately so the badge reflects reality on first paint, then poll.
  void useAniListNotificationsStore.getState().refreshUnreadCount();
  pollInterval = setInterval(() => {
    // Skip the poll while the window is hidden — refresh resumes on next tick.
    if (typeof document !== 'undefined' && document.hidden) return;
    void useAniListNotificationsStore.getState().refreshUnreadCount();
  }, POLL_INTERVAL_MS);
}

export function stopNotificationsPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
