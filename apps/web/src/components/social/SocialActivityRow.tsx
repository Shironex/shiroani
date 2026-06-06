import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';
import type { AniListActivity, AniListActivityUser } from '@shiroani/shared';
import { formatRelativeTime } from '@/lib/relative-time';

/**
 * A single social-feed activity row. Mirrors the Wave 2 profile `ActivityRow`
 * look (`profile/ActivityFeed.tsx`) — that row is module-local and can't be
 * imported, and extracting it would edit `profile/*` (out of scope) — so this is
 * a deliberate sibling re-implementation. The one addition over the profile
 * feed: the activity AUTHOR (`activity.user`), shown as an avatar + handle,
 * because the social feed aggregates updates from many followed users (the
 * profile feed is single-user). The author line is rendered for BOTH the list
 * (poster) and text variants so every row carries avatar + handle.
 *
 * No hover-scale / backdrop-blur / will-change — these rows scroll.
 */

/** Picks the most readable media title (english-first), matching the profile feed. */
function mediaTitle(title: { english?: string; romaji?: string; native?: string }): string {
  return title.english || title.romaji || title.native || '?';
}

interface SocialActivityRowProps {
  item: AniListActivity;
}

export const SocialActivityRow = memo(function SocialActivityRow({ item }: SocialActivityRowProps) {
  const { t: tBrowser } = useTranslation('browser');
  const relative = formatRelativeTime(item.createdAt * 1000, tBrowser);

  if (item.type === 'text') {
    return (
      <div className="flex items-start gap-3 py-2 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
        <div className="min-w-0 flex-1">
          <AuthorLine user={item.user} relative={relative} />
          <p className="mt-0.5 text-[12px] text-foreground/90 leading-snug whitespace-pre-wrap break-words">
            {item.text}
          </p>
        </div>
      </div>
    );
  }

  const title = mediaTitle(item.media.title);
  const line = [item.status, item.progress].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-foreground/3 border border-border-glass/60">
      <PosterThumb src={item.media.coverImage} alt={title} />
      <div className="min-w-0 flex-1">
        <AuthorLine user={item.user} relative={relative} />
        <p className="mt-0.5 text-[12px] font-medium text-foreground/90 leading-tight truncate">
          {title}
        </p>
        {line && <p className="text-[11px] text-muted-foreground leading-tight truncate">{line}</p>}
      </div>
    </div>
  );
});

/**
 * Author avatar (16px) + handle + relative timestamp, rendered above the
 * activity body — uniform across the list and text variants so every row shows
 * who posted it.
 */
function AuthorLine({ user, relative }: { user?: AniListActivityUser; relative: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <AuthorAvatar user={user} />
      {user?.name && (
        <span className="text-[11px] font-semibold text-foreground/80 truncate">{user.name}</span>
      )}
      <span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums shrink-0">
        {relative}
      </span>
    </div>
  );
}

/**
 * 16×16 round author avatar with a placeholder fallback. Local error state (not
 * the global `display:none` helper) so a missing/broken avatar shows a
 * placeholder rather than a hole.
 */
function AuthorAvatar({ user }: { user?: AniListActivityUser }) {
  const { t } = useTranslation('social');
  const [imgError, setImgError] = useState(false);
  const showImage = user?.avatar && !imgError;

  return (
    <span className="w-4 h-4 shrink-0 rounded-full overflow-hidden border border-border/20 bg-muted/30 grid place-items-center">
      {showImage ? (
        <img
          src={user.avatar}
          alt={t('avatarAlt', { name: user?.name ?? '' })}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <UserRound className="w-2.5 h-2.5 text-muted-foreground/40" aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * 40×56 poster thumb with a placeholder fallback. Local error state so a missing
 * cover shows a placeholder rather than a hole.
 */
function PosterThumb({ src, alt }: { src?: string; alt: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className="w-10 h-14 shrink-0 rounded-md overflow-hidden border border-border/20 bg-muted/30">
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
