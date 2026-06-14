import type { FeedItem } from '@shiroani/shared';
import { useCategoryLabels } from '../feed-constants';
import { useTimeAgo } from '../useTimeAgo';
import type { IFeedListItemView } from './FeedListItem.types';

export function useFeedListItem(item: FeedItem): IFeedListItemView {
  const categoryLabels = useCategoryLabels();
  const timeAgo = useTimeAgo();
  const published = item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.createdAt);

  return { categoryLabel: categoryLabels[item.sourceCategory], published };
}
