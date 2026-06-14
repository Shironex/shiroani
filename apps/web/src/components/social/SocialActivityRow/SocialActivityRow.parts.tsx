import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';
import type { AniListActivityUser } from '@shiroani/shared';

/** Most readable media title (english-first), matching the profile feed. */
export function mediaTitle(title: { english?: string; romaji?: string; native?: string }): string {
  return title.english || title.romaji || title.native || '?';
}

/**
 * Author avatar (16px) + handle + relative timestamp, rendered above the
 * activity body — uniform across the list and text variants so every row shows
 * who posted it.
 */
export function AuthorLine({ user, relative }: { user?: AniListActivityUser; relative: string }) {
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

/** 16×16 round author avatar with a local placeholder fallback. */
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

/** 40×56 poster thumb with a local placeholder fallback. */
export function PosterThumb({ src, alt }: { src?: string; alt: string }) {
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
