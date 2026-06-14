import { useCallback, useEffect, useMemo } from 'react';
import type { FeedItem } from '@shiroani/shared';
import { hostFromUrl } from '@/lib/url-utils';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { htmlToParagraphs } from '@/lib/html-text';
import { sanitizeArticleHtml } from '@/lib/sanitize-html';
import { useCategoryLabels } from '../feed-constants';
import { useTimeAgo } from '../useTimeAgo';
import type { IFeedReaderModalView } from './FeedReaderModal.types';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(s => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function useFeedReaderModal(
  item: FeedItem | null,
  open: boolean,
  relatedItems: FeedItem[],
  onOpenChange: (open: boolean) => void
): IFeedReaderModalView {
  const categoryLabels = useCategoryLabels();
  const timeAgo = useTimeAgo();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Preserve legacy fallback of rendering the raw URL when parsing fails.
  const domain = useMemo(() => (item ? (hostFromUrl(item.url) ?? item.url) : ''), [item]);
  const paragraphs = useMemo(
    () => (item?.description ? htmlToParagraphs(item.description) : []),
    [item?.description]
  );
  const feedBodyHtml = useMemo(
    () => (item?.contentHtml ? sanitizeArticleHtml(item.contentHtml, item.url) : ''),
    [item?.contentHtml, item?.url]
  );

  // On-demand extraction (Phase 2): for teaser-only items, ask the main process
  // to fetch + Readability-extract the article when the reader opens. Selected
  // as granular primitives so the modal only re-renders when this item changes.
  const loadArticleContent = useFeedStore(s => s.loadArticleContent);
  const extractedRaw = useFeedStore(s => (item ? s.articleContent[item.id] : undefined));
  const extractionStatus = useFeedStore(s => (item ? s.articleStatus[item.id] : undefined));
  useEffect(() => {
    if (open && item && !item.contentHtml && item.sourceSupportsFullContent) {
      loadArticleContent(item);
    }
  }, [open, item, loadArticleContent]);

  const extractedHtml = useMemo(
    () => (extractedRaw && item ? sanitizeArticleHtml(extractedRaw, item.url) : ''),
    [extractedRaw, item]
  );
  const articleHtml = feedBodyHtml || extractedHtml;
  const isExtracting = !feedBodyHtml && !extractedRaw && extractionStatus === 'loading';

  const bookmarked = useFeedBookmarksStore(s => (item ? s.bookmarks.has(item.id) : false));
  const toggleBookmark = useFeedBookmarksStore(s => s.toggle);
  const handleToggleBookmark = useCallback(() => {
    if (item) toggleBookmark(item);
  }, [item, toggleBookmark]);

  const published = item ? (item.publishedAt ?? item.createdAt) : '';
  const publishedLabel = published ? timeAgo(published) : '';
  const initials = item
    ? item.author
      ? getInitials(item.author)
      : getInitials(item.sourceName)
    : '';
  const relatedFiltered = item ? relatedItems.filter(r => r.id !== item.id).slice(0, 3) : [];

  return {
    domain,
    paragraphs,
    articleHtml,
    isExtracting,
    bookmarked,
    handleToggleBookmark,
    handleClose,
    publishedLabel,
    published,
    initials,
    relatedFiltered,
    categoryLabels,
    timeAgo,
  };
}
