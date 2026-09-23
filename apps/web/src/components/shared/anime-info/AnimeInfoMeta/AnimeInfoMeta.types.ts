import type { AnimeDetail, AnimeDetailTag } from '@shiroani/shared';

export interface IAnimeInfoMetaProps {
  details: AnimeDetail | null;
  mainStudios: string[];
  genres: string[];
  nonSpoilerTags: AnimeDetailTag[];
  cleanDescription?: string;
  loading: boolean;
  descExpanded: boolean;
  onToggleDesc: () => void;
  language: string;
}

export type IAnimeInfoMetaView = Record<string, never>;

export interface IGenresListProps {
  genres: string[];
}

export interface ITagsListProps {
  tags: AnimeDetailTag[];
}
