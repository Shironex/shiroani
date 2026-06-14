import type { AnimeStatus } from '@shiroani/shared';

export interface IAddToLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export type AddToLibraryStep = { step: 'fetching' } | { step: 'ready' };

export interface IStatusOption {
  value: AnimeStatus;
  label: string;
}

export interface IAddToLibraryDialogView {
  readonly statusOptions: IStatusOption[];
  readonly editableTitle: string;
  readonly setEditableTitle: (value: string) => void;
  readonly status: AnimeStatus;
  readonly setStatus: (value: AnimeStatus) => void;
  readonly currentEpisode: number;
  readonly setCurrentEpisode: (value: number) => void;
  readonly totalEpisodes: number;
  readonly setTotalEpisodes: (value: number) => void;
  readonly coverImage: string;
  readonly setCoverImage: (value: string) => void;
  readonly isAdding: boolean;
  readonly isFetchingCover: boolean;
  readonly isCompleted: boolean;
  readonly handleAdd: () => Promise<void>;
}
