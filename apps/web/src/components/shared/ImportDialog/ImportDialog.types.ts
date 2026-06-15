import type { ShiroaniExportFormat, ImportResponse, ImportItemResult } from '@shiroani/shared';

export interface IImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'library' | 'diary' | 'all';
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
