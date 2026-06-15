import type { Dispatch, SetStateAction } from 'react';
import type { AnimeStatus } from '@shiroani/shared';

export interface IBatchActionBarView {
  readonly count: number;
  readonly statusOptions: { value: AnimeStatus; label: string }[];
  readonly showConfirm: boolean;
  readonly setShowConfirm: Dispatch<SetStateAction<boolean>>;
  readonly dockClearanceClass: string;
  readonly handleStatusChange: (value: string) => void;
  readonly handleScoreChange: (value: string) => void;
  readonly handleExit: () => void;
  readonly handleConfirmDelete: () => void;
}
