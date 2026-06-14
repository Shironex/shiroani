import type { AnimeEntry } from '@shiroani/shared';

export interface IResumeSectionProps {
  onNavigate: (url: string) => void;
}

export interface IResumeSectionView {
  readonly watching: AnimeEntry[];
  readonly navigateToLibrary: () => void;
}

export interface IResumeCardProps {
  entry: AnimeEntry;
  onResume: () => void;
}

export interface IEmptyResumeStateProps {
  onBrowseLibrary: () => void;
}
