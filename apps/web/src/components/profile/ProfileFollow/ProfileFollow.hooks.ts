import { useSocialGraph } from '@/hooks/useSocialGraph';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import type { IProfileFollowView } from './ProfileFollow.types';

export function useProfileFollow(): IProfileFollowView {
  const connected = useAniListAuthStore(s => s.status.connected);
  const { following, followers, isLoading, error, pendingIds, refetch, toggleFollow } =
    useSocialGraph();

  return {
    connected,
    following,
    followers,
    isLoading,
    error: Boolean(error),
    pendingIds,
    refetch,
    toggleFollow,
  };
}
