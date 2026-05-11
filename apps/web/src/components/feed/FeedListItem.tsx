import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Rss, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedItem } from '@shiroani/shared';
import { PillTag } from '@/components/ui/pill-tag';
import { useCategoryLabels } from './feed-constants';
import { useTimeAgo } from './useTimeAgo';

interface FeedListItemProps {
  item: FeedItem;
  unread?: boolean;
  onOpen: (item: FeedItem) => void;
  onOpenExternal: (item: FeedItem) => void;
}

function FeedThumb({ src, alt }: { src?: string; alt: string }) {
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  }, []);

  return (
    <div
      className={cn(
        'relative w-[96px] aspect-[16/10] rounded-[6px] overflow-hidden shrink-0',
        'bg-gradient-to-br from-primary/25 via-primary/10 to-foreground/10'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.2), transparent 55%)',
        }}
      />
      <Rss className="absolute inset-0 m-auto w-6 h-6 text-foreground/20" />
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={handleError}
          className="relative w-full h-full object-cover"
        />
      )}
    </div>
  );
}

export const FeedListItem = memo(function FeedListItem({
  item,
  unread = false,
  onOpen,
  onOpenExternal,
}: FeedListItemProps) {
  const { t } = useTranslation('feed');
  const categoryLabels = useCategoryLabels();
  const timeAgo = useTimeAgo();
  const published = item.publishedAt ? timeAgo(item.publishedAt) : timeAgo(item.createdAt);

  return (
    <article
      className={cn(
        'group grid grid-cols-[96px_1fr_auto] gap-3 p-2.5 rounded-[10px]',
        'border border-white/[0.07] bg-white/[0.025] transition-colors duration-200',
        'hover:border-white/[0.12] hover:bg-white/[0.045]',
        unread && 'bg-primary/[0.06] border-primary/[0.2] hover:bg-primary/[0.08]'
      )}
    >
      <button
        onClick={() => onOpen(item)}
        className="block cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      >
        <FeedThumb src={item.imageUrl} alt="" />
      </button>

      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PillTag
            variant="muted"
            style={{
              backgroundColor: `${item.sourceColor}26`,
              color: item.sourceColor,
            }}
          >
            {item.sourceName}
          </PillTag>
          <PillTag variant={item.sourceCategory === 'reviews' ? 'gold' : 'muted'}>
            {categoryLabels[item.sourceCategory]}
          </PillTag>
          {item.sourceLanguage === 'pl' && (
            <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground/70">
              🇵🇱 PL
            </span>
          )}
        </div>

        <h3 className="flex items-start gap-1.5 text-[13px] font-bold tracking-[-0.01em] leading-[1.25] text-foreground line-clamp-2">
          {unread && (
            <span
              aria-hidden="true"
              className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_oklch(from_var(--primary)_l_c_h/0.8)]"
            />
          )}
          <button
            onClick={() => onOpen(item)}
            className={cn(
              'text-left cursor-pointer transition-colors duration-200',
              'hover:text-primary focus-visible:outline-none focus-visible:text-primary'
            )}
          >
            {item.title}
          </button>
        </h3>

        {item.description && (
          <p className="text-[11.5px] leading-[1.45] text-muted-foreground/80 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-2 font-mono text-[9.5px] tracking-[0.1em] uppercase text-muted-foreground/60">
          <span className="truncate max-w-[160px]">{item.sourceName}</span>
          <i aria-hidden="true" className="shrink-0 w-1 h-1 rounded-full bg-foreground/20" />
          <time dateTime={item.publishedAt ?? item.createdAt}>{published}</time>
          {item.author && (
            <>
              <i aria-hidden="true" className="shrink-0 w-1 h-1 rounded-full bg-foreground/20" />
              <span className="truncate max-w-[120px] normal-case tracking-normal">
                {item.author}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 items-end shrink-0">
        <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-muted-foreground/60 whitespace-nowrap">
          {item.sourceName}
        </span>
        <button
          onClick={() => onOpenExternal(item)}
          className={cn(
            'p-1 rounded-md text-muted-foreground/40 transition-all duration-150',
            'hover:text-primary hover:bg-primary/10',
            'opacity-0 group-hover:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary'
          )}
          aria-label={t('item.openExternalAria', { title: item.title })}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
});
