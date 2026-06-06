import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Film, UserRound, UserPlus, Heart, Tv } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AniListNotification } from '@shiroani/shared';
import { formatRelativeTime } from '@/lib/relative-time';

/**
 * A single AniList notification row in the bell panel. Discriminated on
 * `notification.type`:
 *  - `airing` / `related-media` — media cover thumb + AniList's `context` line.
 *  - `following` / `activity`   — round user avatar + `context` line.
 *
 * `context` is AniList's own phrasing (already localized server-side to the
 * user's AniList locale), rendered raw — matching how raw media titles /
 * activity statuses are surfaced elsewhere. No hover-scale / blur — rows scroll.
 */

function mediaTitle(title: { english?: string; romaji?: string; native?: string }): string {
  return title.english || title.romaji || title.native || '?';
}

const TYPE_ICON: Record<AniListNotification['type'], LucideIcon> = {
  airing: Tv,
  following: UserPlus,
  activity: Heart,
  'related-media': Bell,
};

interface NotificationRowProps {
  notification: AniListNotification;
}

export const NotificationRow = memo(function NotificationRow({
  notification,
}: NotificationRowProps) {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(notification.createdAt * 1000, tBrowser);
  const TypeIcon = TYPE_ICON[notification.type];

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
});

function MediaThumb({ src, alt }: { src?: string; alt: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className="w-9 h-12 shrink-0 rounded-md overflow-hidden border border-border/20 bg-muted/30">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full grid place-items-center">
          <Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

function UserAvatar({ src, name }: { src?: string; name: string }) {
  const { t } = useTranslation('social');
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-border/20 bg-muted/30 grid place-items-center">
      {showImage ? (
        <img
          src={src}
          alt={t('avatarAlt', { name })}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <UserRound className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />
      )}
    </div>
  );
}
