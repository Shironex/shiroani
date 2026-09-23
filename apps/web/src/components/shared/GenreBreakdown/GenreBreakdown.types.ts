import type { UserProfile } from '@shiroani/shared';

type GenreStat = UserProfile['statistics']['genres'][number];

export interface IGenreBreakdownProps {
  genres: UserProfile['statistics']['genres'];
  limit?: number;
}

export interface IGenreBreakdownView {
  readonly top: GenreStat[];
  readonly max: number;
}
