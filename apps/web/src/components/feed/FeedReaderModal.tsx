import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ExternalLink, Share2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedItem } from '@shiroani/shared';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TooltipButton } from '@/components/ui/tooltip-button';
import { PillTag } from '@/components/ui/pill-tag';
import { hostFromUrl } from '@/lib/url-utils';
import { useFeedBookmarksStore } from '@/stores/useFeedBookmarksStore';
import { htmlToParagraphs } from '@/lib/html-text';
import { useCategoryLabels } from './feed-constants';
import { useTimeAgo } from './useTimeAgo';

interface FeedReaderModalProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedItems: FeedItem[];
  onOpenRelated: (item: FeedItem) => void;
  onOpenExternal: (item: FeedItem) => void;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map(s => s.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * In-app article reader modal.
 *
 * Matches the "Artykuł — czytnik wbudowany" mock: top-bar with source chip and
 * action buttons, hero image with caption, pill-tag meta row, Shippori Mincho
 * headline, byline, body (sourced from the item's description), and a
 * "Powiązane" panel.
 *
 * Full scraped/reader-mode content is out of scope; the back-end currently
 * only exposes `description`, so we render that as the article body and
 * link out via "Otwórz w przeglądarce" for the full piece.
 */
export const FeedReaderModal = memo(function FeedReaderModal({
  item,
  open,
  onOpenChange,
  relatedItems,
  onOpenRelated,
  onOpenExternal,
}: FeedReaderModalProps) {
  const { t } = useTranslation('feed');
  const categoryLabels = useCategoryLabels();
  const timeAgo = useTimeAgo();
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Preserve legacy fallback of rendering the raw URL when parsing fails.
  const domain = useMemo(() => (item ? (hostFromUrl(item.url) ?? item.url) : ''), [item]);
  const paragraphs = useMemo(
    () => (item?.description ? htmlToParagraphs(item.description) : []),
    [item?.description]
  );

  const bookmarked = useFeedBookmarksStore(s => (item ? s.bookmarks.has(item.id) : false));
  const toggleBookmark = useFeedBookmarksStore(s => s.toggle);
  const handleToggleBookmark = useCallback(() => {
    if (item) toggleBookmark(item);
  }, [item, toggleBookmark]);

  if (!item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sr-only" />
      </Dialog>
    );
  }

  const published = item.publishedAt ?? item.createdAt;
  const publishedLabel = timeAgo(published);
  const initials = item.author ? getInitials(item.author) : getInitials(item.sourceName);
  const relatedFiltered = relatedItems.filter(r => r.id !== item.id).slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 overflow-hidden',
          'w-[min(92vw,820px)] max-w-[820px] h-[min(92vh,760px)]',
          'border-border-glass bg-card'
        )}
      >
        <DialogTitle className="sr-only">{item.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('reader.ariaDescribed', { source: item.sourceName, published: publishedLabel })}
        </DialogDescription>

        {/* Top bar */}
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 border-b border-white/[0.06]">
          <TooltipButton
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={handleClose}
            tooltip={t('reader.close')}
          >
            <ArrowLeft className="w-4 h-4" />
          </TooltipButton>

          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
              'bg-white/[0.04] border border-white/[0.07]'
            )}
          >
            <span
              className="w-4 h-4 rounded-[3px] grid place-items-center text-white font-serif font-bold text-[10px] shrink-0"
              style={{ backgroundColor: item.sourceColor }}
            >
              {item.sourceName.charAt(0).toUpperCase()}
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.05em] text-foreground/85">
              {domain}
            </span>
            <span className="font-mono text-[8.5px] tracking-[0.14em] uppercase px-1.5 py-[2px] rounded bg-primary/15 text-primary">
              {t('reader.readerLabel')}
            </span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <TooltipButton
              variant="ghost"
              size="icon"
              className={cn('w-8 h-8', bookmarked && 'text-primary')}
              onClick={handleToggleBookmark}
              tooltip={bookmarked ? t('reader.removeBookmark') : t('reader.addBookmark')}
              aria-pressed={bookmarked}
            >
              <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
            </TooltipButton>
            <TooltipButton
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              onClick={() => {
                if (navigator.clipboard) {
                  void navigator.clipboard.writeText(item.url);
                }
              }}
              tooltip={t('reader.copyLink')}
            >
              <Share2 className="w-4 h-4" />
            </TooltipButton>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-8 px-2.5 gap-1.5"
              onClick={() => onOpenExternal(item)}
            >
              <ExternalLink className="w-3 h-3" />
              {t('reader.openExternal')}
            </Button>
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          {/* Hero image */}
          <div
            className={cn(
              'relative w-full aspect-[16/7] overflow-hidden shrink-0',
              'bg-gradient-to-br from-primary/40 via-primary/20 to-foreground/20'
            )}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={e => {
                  e.currentTarget.style.display = 'none';
                }}
                className="relative w-full h-full object-cover"
              />
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.15), transparent 55%)',
              }}
            />
            <div
              className={cn(
                'absolute bottom-0 inset-x-0 px-5 py-2',
                'font-mono text-[10px] tracking-[0.04em] text-white/80'
              )}
              style={{
                background: 'linear-gradient(0deg, oklch(0 0 0 / 0.5), transparent)',
              }}
            >
              © {item.sourceName}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-8 pt-6 pb-10 max-w-[680px] mx-auto">
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <PillTag variant="accent">{categoryLabels[item.sourceCategory]}</PillTag>
              <PillTag
                variant="muted"
                style={{
                  backgroundColor: `${item.sourceColor}26`,
                  color: item.sourceColor,
                }}
              >
                {item.sourceName}
              </PillTag>
              <span className="ml-auto font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground/70">
                {publishedLabel}
              </span>
            </div>

            <h1
              className={cn(
                'font-serif font-extrabold text-foreground',
                'text-[22px] sm:text-[24px] leading-[1.25] tracking-[-0.025em] mb-3'
              )}
            >
              {item.title}
            </h1>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/70 text-white grid place-items-center font-semibold text-[11px] shrink-0">
                {initials || '?'}
              </div>
              <div className="min-w-0">
                {item.author && (
                  <div className="text-[12px] font-semibold text-foreground/90 truncate">
                    {item.author}
                  </div>
                )}
                <div className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground/70">
                  <time dateTime={published}>{publishedLabel}</time>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/[0.07] my-4" />

            {paragraphs.length > 0 ? (
              <div className="space-y-3.5">
                {paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-[13.5px] leading-[1.75] text-foreground/80 text-pretty"
                  >
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] leading-[1.75] text-muted-foreground/80">
                {t('reader.previewUnavailable')}
              </p>
            )}

            <div className="h-px bg-white/[0.07] my-6" />

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => onOpenExternal(item)}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {t('reader.readFull')}
              </Button>
            </div>

            {relatedFiltered.length > 0 && (
              <div className="mt-8">
                <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2.5">
                  {t('reader.related')}
                </div>
                <ul className="flex flex-col gap-2">
                  {relatedFiltered.map(rel => (
                    <li key={rel.id}>
                      <button
                        type="button"
                        onClick={() => onOpenRelated(rel)}
                        className={cn(
                          'group w-full grid grid-cols-[72px_1fr] gap-2.5 p-2.5 text-left',
                          'rounded-[9px] border border-white/[0.07] bg-white/[0.03]',
                          'transition-colors duration-150',
                          'hover:border-white/[0.15] hover:bg-white/[0.06]',
                          'focus-visible:outline-none focus-visible:border-primary/40'
                        )}
                      >
                        <div
                          className="rounded-[6px] aspect-[16/10] bg-gradient-to-br from-primary/30 to-foreground/20 overflow-hidden"
                          aria-hidden="true"
                        >
                          {rel.imageUrl && (
                            <img
                              src={rel.imageUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-col justify-center min-w-0">
                          <div className="font-mono text-[8.5px] tracking-[0.14em] uppercase text-primary mb-0.5">
                            {categoryLabels[rel.sourceCategory]}
                          </div>
                          <div className="text-[12px] font-semibold leading-[1.3] text-foreground/90 line-clamp-2 group-hover:text-primary transition-colors">
                            {rel.title}
                          </div>
                          <div className="font-mono text-[9.5px] text-muted-foreground/60 mt-0.5">
                            {rel.sourceName} · {timeAgo(rel.publishedAt ?? rel.createdAt)}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
