import { useTranslation } from 'react-i18next';
import type { IEditorToolbarView } from './EditorToolbar.types';

export function useEditorToolbar(): IEditorToolbarView {
  const { t } = useTranslation('diary');
  return { t };
}
