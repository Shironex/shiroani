import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserProfile } from '@shiroani/shared';
import { FavouriteCard, FavouritePersonCard, FavouriteStudioPill } from './ProfileCharts';

interface ProfileFavouritesProps {
  profile: UserProfile;
  /** Render the shared section heading from the parent dashboard. */
  renderHead: (label: string) => ReactNode;
}

/**
 * All-type favourites surface — anime, manga, characters, staff and studios.
 * Each sub-row renders only when AniList exposed that favourites bucket
 * (the all-type favourites are OPTIONAL on `UserProfile`). When the account has
 * no favourites at all, the whole section is omitted.
 *
 * PERF: the poster/portrait cards are plain (no hover-scale / backdrop-blur /
 * will-change) since these are repeated elements in horizontal scroll rows.
 */
export function ProfileFavourites({ profile, renderHead }: ProfileFavouritesProps) {
  const { t } = useTranslation('profile');

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

  if (!hasAny) return null;

  return (
    <section className="flex flex-col gap-5">
      {anime.length > 0 && (
        <div>
          {renderHead(t('favourites.anime'))}
          <ScrollRow>
            {anime.map(fav => (
              <FavouriteCard key={fav.id} fav={fav} />
            ))}
          </ScrollRow>
        </div>
      )}

      {manga.length > 0 && (
        <div>
          {renderHead(t('favourites.manga'))}
          <ScrollRow>
            {manga.map(fav => (
              <FavouriteCard key={fav.id} fav={fav} />
            ))}
          </ScrollRow>
        </div>
      )}

      {characters.length > 0 && (
        <div>
          {renderHead(t('favourites.characters'))}
          <ScrollRow>
            {characters.map(person => (
              <FavouritePersonCard key={person.id} person={person} />
            ))}
          </ScrollRow>
        </div>
      )}

      {staff.length > 0 && (
        <div>
          {renderHead(t('favourites.staff'))}
          <ScrollRow>
            {staff.map(person => (
              <FavouritePersonCard key={person.id} person={person} />
            ))}
          </ScrollRow>
        </div>
      )}

      {studios.length > 0 && (
        <div>
          {renderHead(t('favourites.studios'))}
          <div className="flex gap-2 flex-wrap">
            {studios.map(studio => (
              <FavouriteStudioPill key={studio.id} studio={studio} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ScrollRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">{children}</div>
  );
}
