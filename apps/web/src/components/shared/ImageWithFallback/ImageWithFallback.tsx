import { cn } from '@/lib/utils';
import { FadeInImage } from '@/components/shared/FadeInImage';
import { useImageWithFallback } from './ImageWithFallback.hooks';
import type { IImageWithFallbackProps } from './ImageWithFallback.types';

/**
 * A cover/avatar frame with a local placeholder fallback, shared by the profile
 * activity feed and the social notification / activity rows. Size and radius are
 * supplied via `className`; the bitmap fades in on decode via {@link FadeInImage}
 * and swaps to `fallback` when there's no `src` or it fails to decode.
 */
export default function ImageWithFallback({
  src,
  alt,
  className,
  fallback,
}: IImageWithFallbackProps) {
  const { showImage, handleError } = useImageWithFallback(src);

  return (
    <div className={cn('shrink-0 overflow-hidden border border-border/20 bg-muted/30', className)}>
      {showImage ? (
        <FadeInImage
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
          onError={handleError}
        />
      ) : (
        <div className="w-full h-full grid place-items-center">{fallback}</div>
      )}
    </div>
  );
}
