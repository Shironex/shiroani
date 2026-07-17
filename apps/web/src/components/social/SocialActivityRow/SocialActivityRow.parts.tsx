import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';
import type { AniListActivityUser } from '@shiroani/shared';
import { ImageWithFallback, mediaTitle } from '../shared';

export { mediaTitle };

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
        <span className="text-[11px] font-semibold text-foreground/80 truncate" title={user.name}>
          {user.name}
        </span>
      )}
      <span className="font-mono text-2xs text-muted-foreground tabular-nums shrink-0">
        {relative}
      </span>
    </div>
  );
}

/** 16×16 round author avatar with a local placeholder fallback. */
function AuthorAvatar({ user }: { user?: AniListActivityUser }) {
  const { t } = useTranslation('social');
  return (
    <ImageWithFallback
      src={user?.avatar}
      alt={t('avatarAlt', { name: user?.name ?? '' })}
      className="w-4 h-4 rounded-full"
      fallback={<UserRound className="w-2.5 h-2.5 text-muted-foreground/40" aria-hidden="true" />}
    />
  );
}

/** 40×56 poster thumb with a local placeholder fallback. */
export function PosterThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      className="w-10 h-14 rounded-md"
      fallback={<Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />}
    />
  );
}
