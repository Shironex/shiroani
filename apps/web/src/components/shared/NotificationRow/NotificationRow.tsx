import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useNotificationRow } from './NotificationRow.hooks';
import { MediaThumb, UserAvatar, mediaTitle } from './NotificationRow.parts';
import type { INotificationRowProps } from './NotificationRow.types';

/**
 * A single AniList notification row in the bell panel. Discriminated on
 * `notification.type`: `airing`/`related-media` show a media thumb, while
 * `following`/`activity` show a round user avatar. `context` is AniList's own
 * (server-localized) phrasing, rendered raw. `unread` tints the row for the
 * items that were still unread when the panel opened.
 */
function NotificationRow({ notification, unread }: INotificationRowProps) {
  const { t } = useTranslation('social');
  const { relative, TypeIcon, typeIconClassName } = useNotificationRow(notification);
  const hasMedia = notification.type === 'airing' || notification.type === 'related-media';

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-2.5 rounded-lg border',
        unread ? 'bg-primary/5 border-primary/20' : 'bg-foreground/3 border-border-glass/60'
      )}
    >
      {hasMedia ? (
        <MediaThumb
          src={notification.media.coverImage}
          alt={mediaTitle(notification.media.title, t('untitled'))}
        />
      ) : (
        <UserAvatar src={notification.user.avatar} name={notification.user.name} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'grid place-items-center w-3.5 h-3.5 shrink-0 rounded',
              typeIconClassName
            )}
          >
            <TypeIcon className="w-2.5 h-2.5" />
          </span>
          <span className="font-mono text-2xs text-muted-foreground tabular-nums">{relative}</span>
        </div>
        <p className="mt-0.5 text-xs text-foreground/90 leading-snug break-words">
          {notification.context}
        </p>
      </div>
    </div>
  );
}

export default memo(NotificationRow);
