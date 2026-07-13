import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocialActivityRow } from './SocialActivityRow.hooks';
import { AuthorLine, PosterThumb, mediaTitle } from './SocialActivityRow.parts';
import type { ISocialActivityRowProps } from './SocialActivityRow.types';

/**
 * A single social-feed activity row. The `list` variant shows a poster + title +
 * status line; the `text` variant shows the freeform body. Both carry the author
 * (avatar + handle) because the social feed aggregates many followed users. No
 * hover-scale / backdrop-blur — these rows scroll.
 */
function SocialActivityRow({ item }: ISocialActivityRowProps) {
  const { t } = useTranslation('social');
  const { relative } = useSocialActivityRow(item.createdAt);

  if (item.type === 'text') {
    return (
      <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
        <div className="min-w-0 flex-1">
          <AuthorLine user={item.user} relative={relative} />
          <p className="mt-0.5 text-xs text-foreground/90 leading-snug whitespace-pre-wrap break-words">
            {item.text}
          </p>
        </div>
      </div>
    );
  }

  const title = mediaTitle(item.media.title, t('untitled'));
  const line = [item.status, item.progress].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <PosterThumb src={item.media.coverImage} alt={title} />
      <div className="min-w-0 flex-1">
        <AuthorLine user={item.user} relative={relative} />
        <p className="mt-0.5 text-xs font-medium text-foreground/90 leading-tight truncate">
          {title}
        </p>
        {line && <p className="text-[11px] text-muted-foreground leading-tight truncate">{line}</p>}
      </div>
    </div>
  );
}

export default memo(SocialActivityRow);
