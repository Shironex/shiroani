import type { FeedCategory, FeedItem } from '@shiroani/shared';

export interface IFeedReaderModalProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedItems: FeedItem[];
  onOpenRelated: (item: FeedItem) => void;
  onOpenExternal: (item: FeedItem) => void;
}

export interface IFeedReaderModalView {
  /** Display host (or raw url fallback) for the source chip. */
  readonly domain: string;
  /** Plain-text teaser paragraphs derived from the item description. */
  readonly paragraphs: string[];
  /** Sanitized full-article HTML (feed body or on-demand extraction), or ''. */
  readonly articleHtml: string;
  /** True while on-demand extraction is in flight and no body is available yet. */
  readonly isExtracting: boolean;
  readonly bookmarked: boolean;
  readonly handleToggleBookmark: () => void;
  readonly handleClose: () => void;
  /** Localized published timestamp label. */
  readonly publishedLabel: string;
  /** ISO published/created timestamp for the `<time>` element. */
  readonly published: string;
  /** Author/source initials for the byline avatar. */
  readonly initials: string;
  /** Up to three related items, current item excluded. */
  readonly relatedFiltered: FeedItem[];
  readonly categoryLabels: Record<FeedCategory | 'all', string>;
  readonly timeAgo: (dateString: string) => string;
}
