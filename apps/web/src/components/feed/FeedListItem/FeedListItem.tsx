import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readableTextColor } from '@/lib/color-utils';
import { PillTag } from '@/components/ui/pill-tag';
import { useFeedListItem } from './FeedListItem.hooks';
import { FeedThumb } from './FeedListItem.parts';
import type { IFeedListItemProps } from './FeedListItem.types';

function FeedListItem({ item, unread = false, onOpen, onOpenExternal }: IFeedListItemProps) {
  const { t } = useTranslation('feed');
  const { categoryLabel, published } = useFeedListItem(item);

  return (
    <article
      className={cn(
        'group grid grid-cols-[96px_1fr_auto] gap-3 p-2.5 rounded-lg',
        'border border-border-glass bg-foreground/[0.03] transition-colors duration-200',
        'hover:border-foreground/20 hover:bg-foreground/[0.06]',
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
              backgroundColor: item.sourceColor,
              color: readableTextColor(item.sourceColor),
            }}
          >
            {item.sourceName}
          </PillTag>
          <PillTag variant={item.sourceCategory === 'reviews' ? 'gold' : 'muted'}>
            {categoryLabel}
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
              'text-left cursor-pointer rounded-sm transition-colors duration-200',
              'hover:text-primary focus-visible:outline-none focus-visible:text-primary',
              'focus-visible:ring-2 focus-visible:ring-ring'
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
          <time dateTime={item.publishedAt ?? item.createdAt}>{published}</time>
          {item.author && (
            <span className="truncate max-w-[120px] normal-case tracking-normal">
              {item.author}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 items-end shrink-0">
        <button
          onClick={() => onOpenExternal(item)}
          className={cn(
            'p-1 rounded-md text-muted-foreground/40 transition-[opacity,color,background-color] duration-150',
            'hover:text-primary hover:bg-primary/10',
            'opacity-0 group-hover:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          aria-label={t('item.openExternalAria', { title: item.title })}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}

export default memo(FeedListItem);
