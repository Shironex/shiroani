import { useViewerActivity } from '@/hooks/useViewerActivity';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import type { IActivityFeedView } from './ActivityFeed.types';

export function useActivityFeed(): IActivityFeedView {
  const connected = useAniListAuthStore(s => s.status.connected);
  const { activities, isLoading, error, refetch } = useViewerActivity();

  return { connected, activities, isLoading, error: Boolean(error), refetch };
}
