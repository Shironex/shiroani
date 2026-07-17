import { useMemo, useEffect } from 'react';
import { toLocalDate } from '@shiroani/shared';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useAppStore } from '@/stores/useAppStore';
import type { AiringCard, IAiringTodaySectionView } from './AiringTodaySection.types';

export function useAiringTodaySection(maxCards: number): IAiringTodaySectionView {
  const todayKey = useMemo(() => toLocalDate(new Date()), []);

  const todayEntries = useScheduleStore(s => s.schedule[todayKey]);
  const isLoading = useScheduleStore(s => s.isLoading);
  const navigateTo = useAppStore(s => s.navigateTo);

  const libraryEntries = useLibraryStore(s => s.entries);
  const libraryAnilistIds = useMemo(() => {
    const ids = new Set<number>();
    for (const entry of libraryEntries) {
      if (entry.anilistId != null) ids.add(entry.anilistId);
    }
    return ids;
  }, [libraryEntries]);

  const subscribedIds = useNotificationStore(s => s.subscribedIds);

  useEffect(() => {
    if (!todayEntries) {
      useScheduleStore.getState().fetchDaily(todayKey);
    }
  }, [todayKey, todayEntries]);

  const cards = useMemo(() => {
    if (!todayEntries) return [] as AiringCard[];

    const sorted = [...todayEntries].sort((a, b) => a.airingAt - b.airingAt);

    // User's anime first, then the rest
    const user: AiringCard[] = [];
    const other: AiringCard[] = [];

    for (const entry of sorted) {
      const mediaId = entry.media.id;
      const isUser = libraryAnilistIds.has(mediaId) || subscribedIds.has(mediaId);
      if (isUser) user.push({ ...entry, isUser: true });
      else other.push({ ...entry, isUser: false });
    }

    return [...user, ...other].slice(0, maxCards);
  }, [todayEntries, libraryAnilistIds, subscribedIds, maxCards]);

  return {
    todayEntries,
    isLoading,
    navigateToSchedule: () => navigateTo('schedule'),
    cards,
  };
}
