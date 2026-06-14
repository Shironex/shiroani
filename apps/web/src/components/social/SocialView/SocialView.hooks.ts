import { useEffect } from 'react';
import { useSocialFeed } from '@/hooks/useSocialFeed';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import type { ISocialViewView } from './SocialView.types';

export function useSocialView(): ISocialViewView {
  const connected = useAniListAuthStore(s => s.status.connected);
  const fetchStatus = useAniListAuthStore(s => s.fetchStatus);
  const { activities, isLoading, error, refetch } = useSocialFeed();

  // AniList auth is resolved lazily app-wide, so this view resolves it on mount —
  // otherwise a connected viewer who lands here first would see the connect
  // prompt (the feed is token-relative and gates on `connected`).
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return { connected, activities, isLoading, error, onRetry: refetch };
}
