import { useProfileFavourites } from './ProfileFavourites.hooks';
import { FavouritesSections } from './ProfileFavourites.parts';
import type { IProfileFavouritesProps } from './ProfileFavourites.types';

/**
 * All-type favourites surface — anime, manga, characters, staff and studios.
 * Each sub-row renders only when AniList exposed that favourites bucket
 * (the all-type favourites are OPTIONAL on `UserProfile`). When the account has
 * no favourites at all, the whole section is omitted.
 *
 * PERF: the poster/portrait cards are plain (no hover-scale / backdrop-blur /
 * will-change) since these are repeated elements in horizontal scroll rows.
 */
export default function ProfileFavourites({ profile, renderHead }: IProfileFavouritesProps) {
  const { anime, manga, characters, staff, studios, hasAny } = useProfileFavourites({ profile });

  if (!hasAny) return null;

  return (
    <FavouritesSections
      anime={anime}
      manga={manga}
      characters={characters}
      staff={staff}
      studios={studios}
      hasAny={hasAny}
      renderHead={renderHead}
    />
  );
}
