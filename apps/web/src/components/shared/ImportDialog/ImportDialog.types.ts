import type { ShiroaniExportFormat, ImportResponse, ImportItemResult } from '@shiroani/shared';

export interface IImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'library' | 'diary' | 'all';
  /**
   * Raw JSON text already read by the caller (a file dropped onto the window).
   * When set, the dialog skips the native file picker and goes straight to the
   * same validation and preview the picker flow uses. The user still picks a
   * strategy and confirms before anything is imported.
   */
  preloadedContent?: string | null;
}

export type ImportStep =
  | { step: 'idle' }
  | { step: 'loading-file' }
  | { step: 'file-error'; message: string }
  | { step: 'preview'; data: ShiroaniExportFormat; libraryCount: number; diaryCount: number }
  | { step: 'importing'; items: ImportItemResult[]; totalCount: number }
  | { step: 'done'; result: ImportResponse };

export type ImportStrategy = 'skip' | 'overwrite';

export interface IImportProgressInfo {
  completed: number;
  currentItem: ImportItemResult | undefined;
  percent: number;
}

export interface IImportDialogView {
  readonly state: ImportStep;
  readonly strategy: ImportStrategy;
  readonly setStrategy: (strategy: ImportStrategy) => void;
  readonly handleImport: () => void;
  readonly handleOpenChange: (value: boolean) => void;
  readonly progressInfo: IImportProgressInfo | null;
  readonly isImporting: boolean;
}
