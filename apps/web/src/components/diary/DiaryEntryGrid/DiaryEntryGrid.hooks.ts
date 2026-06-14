import { useTranslation } from 'react-i18next';
import type { IDiaryEntryGridView } from './DiaryEntryGrid.types';

export function useDiaryEntryGrid(): IDiaryEntryGridView {
  const { t } = useTranslation('diary');
  return { t };
}
