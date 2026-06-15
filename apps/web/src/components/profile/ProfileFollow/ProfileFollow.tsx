import { useTranslation } from 'react-i18next';
import { useProfileFollow } from './ProfileFollow.hooks';
import { FollowError, FollowGroup } from './ProfileFollow.parts';
import type { IProfileFollowProps } from './ProfileFollow.types';

/**
 * Following / Followers surface for the connected viewer.
 *
 * Both lists come from {@link useSocialGraph} (viewer-scoped, resolved main-side
 * from the OAuth token), so the whole section is gated on a connected AniList
 * account — a public profile must not expose your social graph. Each list is a
 * collapsible group: a header with a count, then (when expanded) the rows of
 * users with a per-user follow/unfollow toggle.
 *
 * The backend pages at 50 entries, so the counts are "loaded users", phrased as
 * such in the copy — not the full graph total.
 *
 * PERF: rows are memoized and prop-driven (stable `onToggle` from the hook), with
 * plain avatars (local `imgError`, lazy, no hover-scale / blur / will-change)
 * since they are repeated elements in a scrollable column.
 */
export default function ProfileFollow({ renderHead }: IProfileFollowProps) {
  const { t } = useTranslation('profile');
  const { connected, following, followers, isLoading, error, pendingIds, refetch, toggleFollow } =
    useProfileFollow();

  // Viewer-scoped: nothing to show without a connected account. Render nothing
  // (vs. an empty list that would read as a bug on a public profile).
  if (!connected) return null;

  return (
    <section>
      {renderHead(t('social.heading'))}
      {error ? (
        <FollowError onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <FollowGroup
            label={t('social.following')}
            users={following}
            isLoading={isLoading}
            pendingIds={pendingIds}
            onToggle={toggleFollow}
            emptyLabel={t('social.followingEmpty')}
          />
          <FollowGroup
            label={t('social.followers')}
            users={followers}
            isLoading={isLoading}
            pendingIds={pendingIds}
            onToggle={toggleFollow}
            emptyLabel={t('social.followersEmpty')}
          />
        </div>
      )}
    </section>
  );
}
