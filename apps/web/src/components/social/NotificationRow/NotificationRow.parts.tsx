import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';

/** Most readable media title (english-first), matching the activity feed. */
export function mediaTitle(title: { english?: string; romaji?: string; native?: string }): string {
  return title.english || title.romaji || title.native || '?';
}

/** Media cover thumb with a local placeholder fallback (no global helper). */
export function MediaThumb({ src, alt }: { src?: string; alt: string }) {
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

/** Round user avatar with a local placeholder fallback. */
export function UserAvatar({ src, name }: { src?: string; name: string }) {
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
