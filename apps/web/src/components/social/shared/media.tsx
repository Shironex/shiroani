import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FadeInImage } from '@/components/shared/FadeInImage';

/**
 * Most readable media title (english-first), shared by the notification and
 * social-activity rows. `fallback` is used when AniList returns no title in any
 * language (callers pass a localized "Untitled").
 */
export function mediaTitle(
  title: { english?: string; romaji?: string; native?: string },
  fallback: string
): string {
  return title.english || title.romaji || title.native || fallback;
}

interface IImageWithFallbackProps {
  src?: string;
  alt: string;
  /** Size + radius classes for the frame (e.g. `w-9 h-12 rounded-md`). */
  className?: string;
  /** Icon shown when there's no image or it fails to decode. */
  fallback: ReactNode;
}

/**
 * A cover/avatar frame with a local placeholder fallback, shared by the
 * notification and social-activity rows. Size and radius are supplied via
 * `className`; the bitmap fades in on decode via {@link FadeInImage} and swaps to
 * `fallback` on error.
 */
export function ImageWithFallback({ src, alt, className, fallback }: IImageWithFallbackProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  return (
    <div className={cn('shrink-0 overflow-hidden border border-border/20 bg-muted/30', className)}>
      {showImage ? (
        <FadeInImage
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full grid place-items-center">{fallback}</div>
      )}
    </div>
  );
}
