import { useCallback } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { IThemeStepView } from './ThemeStep.types';

export function useThemeStep(): IThemeStepView {
  const theme = useSettingsStore(s => s.theme);
  const setTheme = useSettingsStore(s => s.setTheme);
  const setPreviewTheme = useSettingsStore(s => s.setPreviewTheme);
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);
  return { theme, setTheme, setPreviewTheme, clearPreview };
}
