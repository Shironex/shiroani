import { CharactersList, RelationsList, StaffList } from './AnimeInfoPeople.parts';
import type { IAnimeInfoPeopleProps } from './AnimeInfoPeople.types';

export default function AnimeInfoPeople({ details }: IAnimeInfoPeopleProps) {
  const characters = details?.characters?.edges ?? [];
  const staff = details?.staff?.edges ?? [];
  const relations = details?.relations?.edges ?? [];

  const hasCharacters = characters.length > 0;
  const hasStaff = staff.length > 0;
  const hasRelations = relations.length > 0;

  return (
    <>
      {/* Characters */}
      {hasCharacters && <CharactersList characters={characters} />}

      {/* Staff */}
      {hasStaff && <StaffList staff={staff} />}

      {/* Relations */}
      {hasRelations && <RelationsList relations={relations} />}
    </>
  );
}
