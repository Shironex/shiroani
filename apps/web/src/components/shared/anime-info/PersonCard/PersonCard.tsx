import { FadeInImage } from '@/components/shared/FadeInImage';
import type { IPersonCardProps } from './PersonCard.types';

/** Reusable avatar + name + subtitle card used for characters and staff */
export default function PersonCard({ imageUrl, name, subtitle }: IPersonCardProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
      {imageUrl ? (
        <FadeInImage
          src={imageUrl}
          alt={name}
          className="w-8 h-8 rounded-full object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium truncate" title={name}>
          {name}
        </p>
        <p className="text-2xs text-muted-foreground truncate" title={subtitle}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
