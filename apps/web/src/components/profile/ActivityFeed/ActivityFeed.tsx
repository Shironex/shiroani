import { useTranslation } from 'react-i18next';
import { useActivityFeed } from './ActivityFeed.hooks';
import { ActivityEmpty, ActivityError, ActivityList, ActivityLoading } from './ActivityFeed.parts';

/**
 * Recent AniList activity feed for the authenticated viewer.
 *
 * The feed is viewer-scoped (resolved from the stored OAuth token main-side via
 * {@link useViewerActivity}), so it only renders real entries when an AniList
 * account is connected. When viewing a public username without a connection the
 * "connect" prompt shows instead of an empty list — an empty feed there would
 * read as a bug rather than the by-design "no token, no viewer activity".
 *
 * `status`/`progress` arrive as AniList's freeform strings (progress can be a
 * range like "12 - 13") and are rendered raw with Polish chrome — there is no
 * status→PL mapping table, matching how raw media titles are surfaced.
 */
export default function ActivityFeed() {
  const { t } = useTranslation('profile');
  const { connected, activities, isLoading, error, refetch } = useActivityFeed();

  // Activity is viewer-scoped: without a connected account there is nothing to
  // fetch. Surface a "connect" prompt instead of conflating it with an empty
  // feed (which would read as a bug for a public profile you don't own).
  if (!connected) {
    return <ActivityEmpty message={t('activity.notConnected')} />;
  }

  if (error) {
    return <ActivityError message={t('activity.error')} onRetry={refetch} />;
  }

  if (isLoading) {
    return <ActivityLoading />;
  }

  if (activities.length === 0) {
    return <ActivityEmpty message={t('activity.empty')} />;
  }

  return <ActivityList activities={activities} />;
}
