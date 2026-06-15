import type { AnimeDetail, AnimeDetailRelation, AnimeEntry } from '@shiroani/shared';

export interface IRelationsSectionProps {
  /** AniList media id of the entry whose relations to show. */
  anilistId: number;
}

export interface IRelationsSectionView {
  readonly detail: AnimeDetail | undefined;
  readonly isLoading: boolean;
  readonly failed: boolean;
  readonly relations: AnimeDetailRelation[];
  readonly entryByAnilistId: Map<number, AnimeEntry>;
  readonly openLibraryEntry: (entry: AnimeEntry) => void;
}
