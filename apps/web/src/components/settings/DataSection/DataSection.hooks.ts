import { useState } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useDiaryStore } from '@/stores/useDiaryStore';
import type { IDataSectionView } from './DataSection.types';

export function useDataSection(): IDataSectionView {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const libraryCount = useLibraryStore(s => s.entries.length);
  const diaryCount = useDiaryStore(s => s.entries.length);

  return {
    exportOpen,
    setExportOpen,
    importOpen,
    setImportOpen,
    deleteOpen,
    setDeleteOpen,
    libraryCount,
    diaryCount,
  };
}
