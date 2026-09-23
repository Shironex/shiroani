import { Badge } from '@/components/ui/badge';
import type { IGenresListProps, ITagsListProps } from './AnimeInfoMeta.types';

/** Genre badges. */
export function GenresList({ genres }: IGenresListProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {genres.map(genre => (
        <Badge key={genre} variant="secondary" className="text-xs">
          {genre}
        </Badge>
      ))}
    </div>
  );
}

/** Non-spoiler tag badges with optional rank percentage. */
export function TagsList({ tags }: ITagsListProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge key={tag.id} variant="outline" className="text-2xs">
          {tag.name}
          {tag.rank != null && <span className="text-muted-foreground ml-1">{tag.rank}%</span>}
        </Badge>
      ))}
    </div>
  );
}
