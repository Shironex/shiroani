import type { FeedItem } from '@shiroani/shared';

export interface IFeedListItemProps {
  item: FeedItem;
  unread?: boolean;
  onOpen: (item: FeedItem) => void;
  onOpenExternal: (item: FeedItem) => void;
}

export interface IFeedListItemView {
  readonly categoryLabel: string;
  readonly published: string;
}
