import type { ExportResponse } from '@shiroani/shared';

export interface IExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'library' | 'diary' | 'all';
  selectedIds?: number[];
}

export type ExportState =
  | { step: 'idle' }
  | { step: 'loading' }
  | { step: 'success'; data: ExportResponse }
  | { step: 'error'; message: string }
  | { step: 'saving' }
  | { step: 'saved' }
  | { step: 'save-error'; message: string };

export interface IExportDialogView {
  /** A file of this export would be over the import cap. */
  readonly exportTooLarge: boolean;
  /** The import cap, for the warning text. */
  readonly importCapMb: number;
  readonly state: ExportState;
  readonly handleSave: () => void;
  readonly handleOpenChange: (value: boolean) => void;
}
