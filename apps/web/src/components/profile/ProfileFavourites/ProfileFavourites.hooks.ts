import type { IProfileFavouritesProps, IProfileFavouritesView } from './ProfileFavourites.types';

export function useProfileFavourites({
  profile,
}: Pick<IProfileFavouritesProps, 'profile'>): IProfileFavouritesView {
  const anime = profile.favourites ?? [];
  const manga = profile.favouritesManga ?? [];
  const characters = profile.favouritesCharacters ?? [];
  const staff = profile.favouritesStaff ?? [];
  const studios = profile.favouritesStudios ?? [];

  const hasAny =
    anime.length > 0 ||
    manga.length > 0 ||
    characters.length > 0 ||
    staff.length > 0 ||
    studios.length > 0;

  return { anime, manga, characters, staff, studios, hasAny };
}
