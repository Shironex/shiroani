import { memo } from 'react';
import { useNotificationRow } from './NotificationRow.hooks';
import { MediaThumb, UserAvatar, mediaTitle } from './NotificationRow.parts';
import type { INotificationRowProps } from './NotificationRow.types';

/**
 * A single AniList notification row in the bell panel. Discriminated on
 * `notification.type`: `airing`/`related-media` show a media thumb, while
 * `following`/`activity` show a round user avatar. `context` is AniList's own
 * (server-localized) phrasing, rendered raw.
 */
function NotificationRow({ notification }: INotificationRowProps) {
  const { relative, TypeIcon } = useNotificationRow(notification);
  const hasMedia = notification.type === 'airing' || notification.type === 'related-media';

  return (
    <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      {hasMedia ? (
        <MediaThumb
          src={notification.media.coverImage}
          alt={mediaTitle(notification.media.title)}
        />
      ) : (
        <UserAvatar src={notification.user.avatar} name={notification.user.name} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="grid place-items-center w-3.5 h-3.5 shrink-0 rounded bg-primary/15 text-primary"
          >
            <TypeIcon className="w-2.5 h-2.5" />
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums">
            {relative}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-foreground/90 leading-snug break-words">
          {notification.context}
        </p>
      </div>
    </div>
  );
}

export default memo(NotificationRow);
