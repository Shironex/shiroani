import type {
  AnimeDetail,
  AnimeDetailCharacter,
  AnimeDetailRelation,
  AnimeDetailStaff,
} from '@shiroani/shared';

export interface IAnimeInfoPeopleProps {
  details: AnimeDetail | null;
}

export type IAnimeInfoPeopleView = Record<string, never>;

export interface ICharactersListProps {
  characters: AnimeDetailCharacter[];
}

export interface IStaffListProps {
  staff: AnimeDetailStaff[];
}

export interface IRelationsListProps {
  relations: AnimeDetailRelation[];
}
