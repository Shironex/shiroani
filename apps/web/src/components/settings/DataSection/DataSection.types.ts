import type { Dispatch, SetStateAction } from 'react';
import type { LucideIcon } from 'lucide-react';

export type IDataSectionProps = Record<string, never>;

export interface IDataSectionView {
  readonly exportOpen: boolean;
  readonly setExportOpen: Dispatch<SetStateAction<boolean>>;
  readonly importOpen: boolean;
  readonly setImportOpen: Dispatch<SetStateAction<boolean>>;
  readonly deleteOpen: boolean;
  readonly setDeleteOpen: Dispatch<SetStateAction<boolean>>;
  readonly libraryCount: number;
  readonly diaryCount: number;
}

export interface IExportScopeTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}
