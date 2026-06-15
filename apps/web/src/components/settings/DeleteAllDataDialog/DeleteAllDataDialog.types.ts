import type { Dispatch, SetStateAction } from 'react';

/**
 * Internal state machine for the wipe flow. `idle` is the resting state,
 * `wiping` latches while {@link wipeAllData} runs, and `error` carries a
 * user-facing message when the wipe fails (the only path that returns control).
 */
export type WipeState = { step: 'idle' } | { step: 'wiping' } | { step: 'error'; message: string };

export interface IDeleteAllDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close this dialog and open the export-all flow, so the user can back up first. */
  onExportFirst: () => void;
}

export interface IDeleteAllDataDialogView {
  readonly state: WipeState;
  readonly input: string;
  readonly setInput: Dispatch<SetStateAction<string>>;
  readonly matches: boolean;
  readonly isWiping: boolean;
  readonly hasError: boolean;
  readonly inputId: string;
  readonly errorId: string;
  readonly keyword: string;
  readonly handleOpenChange: (value: boolean) => void;
  readonly handleConfirm: () => void;
}
