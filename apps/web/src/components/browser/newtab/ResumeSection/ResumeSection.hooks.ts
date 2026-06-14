import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import type { IResumeSectionView } from './ResumeSection.types';

export function useResumeSection(): IResumeSectionView {
  const entries = useLibraryStore(s => s.entries);
  const navigateTo = useAppStore(s => s.navigateTo);

  const watching = useMemo(() => {
    return entries
      .filter(e => e.status === 'watching')
      .sort((a, b) => {
        const ta = new Date(a.updatedAt || a.addedAt).getTime();
        const tb = new Date(b.updatedAt || b.addedAt).getTime();
        return tb - ta;
      })
      .slice(0, 6);
  }, [entries]);

  return { watching, navigateToLibrary: () => navigateTo('library') };
}
