import type { ReactNode } from 'react';
import type {
  UserProfile,
  UserProfileFavouriteMedia,
  UserProfileFavouritePerson,
  UserProfileFavouriteStudio,
} from '@shiroani/shared';

export interface IProfileFavouritesProps {
  profile: UserProfile;
  /** Render the shared section heading from the parent dashboard. */
  renderHead: (label: string) => ReactNode;
}

export interface IProfileFavouritesView {
  readonly anime: UserProfileFavouriteMedia[];
  readonly manga: UserProfileFavouriteMedia[];
  readonly characters: UserProfileFavouritePerson[];
  readonly staff: UserProfileFavouritePerson[];
  readonly studios: UserProfileFavouriteStudio[];
  readonly hasAny: boolean;
}
