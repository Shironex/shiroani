import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';
import { ImageWithFallback, mediaTitle } from '../shared';

export { mediaTitle };

/** Media cover thumb with a local placeholder fallback. */
export function MediaThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      className="w-9 h-12 rounded-md"
      fallback={<Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />}
    />
  );
}

/** Round user avatar with a local placeholder fallback. */
export function UserAvatar({ src, name }: { src?: string; name: string }) {
  const { t } = useTranslation('social');
  return (
    <ImageWithFallback
      src={src}
      alt={t('avatarAlt', { name })}
      className="w-9 h-9 rounded-full"
      fallback={<UserRound className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />}
    />
  );
}
