import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import type { NotificationSubscription, AiringAnime } from '@shiroani/shared';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('NotificationStore');

interface NotificationState {
  subscriptions: NotificationSubscription[];
  subscribedIds: Set<number>;
  loaded: boolean;
}

interface NotificationActions {
  loadSubscriptions: () => Promise<void>;
  subscribe: (anime: AiringAnime) => Promise<void>;
  unsubscribe: (anilistId: number) => Promise<void>;
  toggleSubscription: (anilistId: number) => Promise<void>;
  isSubscribed: (anilistId: number) => boolean;
}

type NotificationStore = NotificationState & NotificationActions;

function buildSubscribedIds(subscriptions: NotificationSubscription[]): Set<number> {
  return new Set(subscriptions.map(s => s.anilistId));
}

export const useNotificationStore = create<NotificationStore>()(
  maybeDevtools(
    (set, get) => ({
      // State
      subscriptions: [],
      subscribedIds: new Set<number>(),
      loaded: false,

      // Actions
      loadSubscriptions: async () => {
        try {
          const subs = (await window.electronAPI?.notifications?.getSubscriptions()) ?? [];
          set(
            { subscriptions: subs, subscribedIds: buildSubscribedIds(subs), loaded: true },
            undefined,
            'notifications/loaded'
          );
        } catch (error) {
          logger.error('Failed to load subscriptions:', error);
          set({ loaded: true }, undefined, 'notifications/loadError');
        }
      },

      subscribe: async (anime: AiringAnime) => {
        const mediaId = anime.media.id;
        const title = anime.media.title.english || anime.media.title.romaji || 'Nieznane anime';
        const titleRomaji = anime.media.title.romaji;
        const coverImage = anime.media.coverImage.large || anime.media.coverImage.medium;

        const subscription: NotificationSubscription = {
          anilistId: mediaId,
          title,
          titleRomaji,
          coverImage,
          subscribedAt: new Date().toISOString(),
          enabled: true,
          source: 'schedule',
        };

        // Optimistic update
        const current = get().subscriptions;
        if (current.some(s => s.anilistId === mediaId)) return;
        const next = [...current, subscription];
        set(
          { subscriptions: next, subscribedIds: buildSubscribedIds(next) },
          undefined,
          'notifications/subscribed'
        );

        // Fire IPC in background
        try {
          await window.electronAPI?.notifications?.addSubscription(subscription);
        } catch (error) {
          logger.error('Failed to add subscription via IPC:', error);
          // Revert on failure
          set(
            { subscriptions: current, subscribedIds: buildSubscribedIds(current) },
            undefined,
            'notifications/subscribeReverted'
          );
        }
      },

      unsubscribe: async (anilistId: number) => {
        const current = get().subscriptions;
        const next = current.filter(s => s.anilistId !== anilistId);

        // Optimistic update
        set(
          { subscriptions: next, subscribedIds: buildSubscribedIds(next) },
          undefined,
          'notifications/unsubscribed'
        );

        // Fire IPC in background
        try {
          await window.electronAPI?.notifications?.removeSubscription(anilistId);
        } catch (error) {
          logger.error('Failed to remove subscription via IPC:', error);
          // Revert on failure
          set(
            { subscriptions: current, subscribedIds: buildSubscribedIds(current) },
            undefined,
            'notifications/unsubscribeReverted'
          );
        }
      },

      toggleSubscription: async (anilistId: number) => {
        const current = get().subscriptions;
        const next = current.map(s =>
          s.anilistId === anilistId ? { ...s, enabled: !s.enabled } : s
        );

        // Optimistic update
        set(
          { subscriptions: next, subscribedIds: buildSubscribedIds(next) },
          undefined,
          'notifications/toggled'
        );

        // Fire IPC in background
        try {
          await window.electronAPI?.notifications?.toggleSubscription(anilistId);
        } catch (error) {
          logger.error('Failed to toggle subscription via IPC:', error);
          // Revert on failure
          set(
            { subscriptions: current, subscribedIds: buildSubscribedIds(current) },
            undefined,
            'notifications/toggleReverted'
          );
        }
      },

      isSubscribed: (anilistId: number) => {
        return get().subscribedIds.has(anilistId);
      },
    }),
    { name: 'notifications' }
  )
);
