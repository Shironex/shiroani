import { Rss } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleImageError } from '@/lib/image-utils';
import { FadeInImage } from '@/components/shared/FadeInImage';

/** Thumbnail tile for a feed list row, with a decorative RSS placeholder. */
export function FeedThumb({ src, alt }: { src?: string; alt: string }) {
  return (
    <div
      className={cn(
        'relative w-[96px] aspect-[16/10] rounded-md overflow-hidden shrink-0',
        'bg-gradient-to-br from-primary/25 via-primary/10 to-foreground/10'
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.2), transparent 55%)',
        }}
      />
      <Rss className="absolute inset-0 m-auto w-6 h-6 text-foreground/20" />
      {src && (
        <FadeInImage
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={handleImageError}
          className="relative w-full h-full object-cover"
        />
      )}
    </div>
  );
}
