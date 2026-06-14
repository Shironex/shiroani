import type { FeedItem } from '@shiroani/shared';
import { useCategoryLabels } from '../feed-constants';
import { useTimeAgo } from '../useTimeAgo';
import type { IFeedHeroView } from './FeedHero.types';

export function useFeedHero(item: FeedItem): IFeedHeroView {
  const categoryLabels = useCategoryLabels();
  const timeAgo = useTimeAgo();

  const published = item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.createdAt);

  return { categoryLabel: categoryLabels[item.sourceCategory], published };
}
