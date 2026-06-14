import type { FeedItem } from '@shiroani/shared';

export interface IFeedHeroProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
}

export interface IFeedHeroView {
  readonly categoryLabel: string;
  readonly published: string;
}
