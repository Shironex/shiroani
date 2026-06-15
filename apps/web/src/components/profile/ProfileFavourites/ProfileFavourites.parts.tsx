import { memo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, UserRound } from 'lucide-react';
import type {
  UserProfile,
  UserProfileFavouritePerson,
  UserProfileFavouriteStudio,
} from '@shiroani/shared';
import type { IProfileFavouritesView } from './ProfileFavourites.types';

/** Poster card for a favourited anime/manga. Plain (no hover-scale / blur). */
export const FavouriteCard = memo(function FavouriteCard({
  fav,
}: {
  fav: UserProfile['favourites'][number];
}) {
  const [imgError, setImgError] = useState(false);
  const title = fav.title.english || fav.title.romaji || fav.title.native || '?';

  return (
    <div className="w-[90px] shrink-0">
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/20 relative">
        {fav.coverImage && !imgError ? (
          <img
            src={fav.coverImage}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <Film className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
          <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">{title}</p>
        </div>
      </div>
    </div>
  );
});

/**
 * Portrait card for a favourited character or staff member. Same poster
 * footprint as {@link FavouriteCard} but keyed on `name`/`image`. No
 * hover-scale / blur / will-change — these cards live in horizontal scroll rows.
 */
export const FavouritePersonCard = memo(function FavouritePersonCard({
  person,
}: {
  person: UserProfileFavouritePerson;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="w-[90px] shrink-0">
      <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border/20 relative">
        {person.image && !imgError ? (
          <img
            src={person.image}
            alt={person.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <UserRound className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
          <p className="text-[10px] font-medium text-white leading-tight line-clamp-2">
            {person.name}
          </p>
        </div>
      </div>
    </div>
  );
});

/**
 * Pill for a favourited studio. Studios have no image on AniList, so they
 * render as a labelled chip rather than a poster card.
 */
export function FavouriteStudioPill({ studio }: { studio: UserProfileFavouriteStudio }) {
  return (
    <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg bg-foreground/5 border border-border-glass text-[12px] font-medium text-foreground/90">
      {studio.name}
    </span>
  );
}

function ScrollRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">{children}</div>
  );
}

interface FavouritesSectionsProps extends IProfileFavouritesView {
  renderHead: (label: string) => ReactNode;
}

/**
 * The all-type favourites body. Each sub-row renders only when AniList exposed
 * that bucket. Kept in parts so the shell stays declarative (no in-JSX `.map`).
 */
export function FavouritesSections({
  anime,
  manga,
  characters,
  staff,
  studios,
  renderHead,
}: FavouritesSectionsProps) {
  const { t } = useTranslation('profile');

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
