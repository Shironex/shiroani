import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ComingSoonPlaceholder } from '@/components/shared/ComingSoonPlaceholder';

/**
 * Recent AniList activity feed — scrobbles, status changes, ratings.
 *
 * The mock shows a list of poster-thumb rows (40×56px) with a title,
 * a status-change line and a timestamp. The current AniList profile
 * sync (`UserProfile` in @shiroani/shared) only returns aggregated
 * statistics + favourites; no `activity` array exists today. Surface a
 * ComingSoonPlaceholder until the backend exposes the feed.
 */
export function ActivityFeed() {
  const { t } = useTranslation('profile');
  return (
    <ComingSoonPlaceholder
      icon={Activity}
      title={t('activityFeed.title')}
      description={t('activityFeed.description')}
      tag={t('activityFeed.tag')}
    />
  );
}
