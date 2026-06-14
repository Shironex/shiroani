import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/image-utils';
import type { FeedCategory, FeedItem } from '@shiroani/shared';

interface IArticleBodyProps {
  articleHtml: string;
  isExtracting: boolean;
  paragraphs: string[];
}

/** Article body: sanitized HTML, the extracting placeholder, teaser, or fallback. */
export function ArticleBody({ articleHtml, isExtracting, paragraphs }: IArticleBodyProps) {
  const { t } = useTranslation('feed');

  if (articleHtml) {
    return (
      <div
        className="feed-prose"
        // Sanitized via DOMPurify in sanitizeArticleHtml (scripts/iframes
        // stripped, lazy images rewritten, links forced rel/target).
        dangerouslySetInnerHTML={{ __html: articleHtml }}
      />
    );
  }

  if (isExtracting) {
    return (
      <div className="space-y-3.5" aria-busy="true">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-[12px]">{t('reader.loadingArticle')}</span>
        </div>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[13.5px] leading-[1.75] text-foreground/80 text-pretty">
            {p}
          </p>
        ))}
      </div>
    );
  }

  if (paragraphs.length > 0) {
    return (
      <div className="space-y-3.5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[13.5px] leading-[1.75] text-foreground/80 text-pretty">
            {p}
          </p>
        ))}
      </div>
    );
  }

  return (
    <p className="text-[13.5px] leading-[1.75] text-muted-foreground/80">
      {t('reader.previewUnavailable')}
    </p>
  );
}

interface IRelatedPanelProps {
  related: FeedItem[];
  categoryLabels: Record<FeedCategory | 'all', string>;
  timeAgo: (dateString: string) => string;
  onOpenRelated: (item: FeedItem) => void;
}

/** "Powiązane" panel of up to three related items. */
export function RelatedPanel({
  related,
  categoryLabels,
  timeAgo,
  onOpenRelated,
}: IRelatedPanelProps) {
  const { t } = useTranslation('feed');

  return (
    <div className="mt-8">
      <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground/60 mb-2.5">
        {t('reader.related')}
      </div>
      <ul className="flex flex-col gap-2">
        {related.map(rel => (
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
                    onError={handleImageError}
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
  );
}
