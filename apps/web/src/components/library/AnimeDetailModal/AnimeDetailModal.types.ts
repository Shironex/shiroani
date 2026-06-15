import type { Dispatch, SetStateAction } from 'react';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

export interface IAnimeDetailModalProps {
  entry: AnimeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Which external provider an {@link EntrySyncSection} reconciles against. */
export type EntrySyncProvider = 'anilist' | 'mal';

export interface IEntrySyncSectionProps {
  entryId: number;
  provider: EntrySyncProvider;
}

export interface IAnimeDetailModalView {
  readonly statusOptions: { value: AnimeStatus; label: string }[];

  // Form state (from useAnimeDetailForm)
  readonly status: AnimeStatus;
  readonly setStatus: (status: AnimeStatus) => void;
  readonly currentEpisode: number;
  readonly setCurrentEpisode: (value: number) => void;
  readonly score: number;
  readonly setScore: (value: number) => void;
  readonly notes: string;
  readonly setNotes: (value: string) => void;
  readonly resumeUrl: string;
  readonly setResumeUrl: (value: string) => void;
  readonly anilistId: string;
  readonly setAnilistId: (value: string) => void;

  readonly showConfirm: boolean;
  readonly setShowConfirm: Dispatch<SetStateAction<boolean>>;

  // Handlers
  readonly handleSave: () => void;
  readonly handleRemove: () => void;
  readonly handleOpenInBrowser: () => void;
  readonly handleNavigate: (url: string) => void;
  readonly handleUpdateUrl: () => void;
}
