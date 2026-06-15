import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { getAllThemeOptions } from '@/lib/theme';
import { removeCustomThemeCSS } from '@/lib/custom-theme-css';
import type {
  IThemesSectionProps,
  IThemesSectionView,
  IThemeToDelete,
} from './ThemesSection.types';

export function useThemesSection(_props?: IThemesSectionProps): IThemesSectionView {
  const { t } = useTranslation('settings');
  const theme = useSettingsStore(s => s.theme);
  const uiFontScale = useSettingsStore(s => s.uiFontScale);
  const setTheme = useSettingsStore(s => s.setTheme);
  const setPreviewTheme = useSettingsStore(s => s.setPreviewTheme);
  const setUIFontScale = useSettingsStore(s => s.setUIFontScale);
  const customThemes = useCustomThemeStore(s => s.customThemes);
  const deleteTheme = useCustomThemeStore(s => s.deleteTheme);
  const exportTheme = useCustomThemeStore(s => s.exportTheme);
  const importTheme = useCustomThemeStore(s => s.importTheme);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editThemeId, setEditThemeId] = useState<string | undefined>();
  const [cloneFromTheme, setCloneFromTheme] = useState<string | undefined>();
  const [themeToDelete, setThemeToDelete] = useState<IThemeToDelete | null>(null);

  const handleCreateNew = useCallback(() => {
    setEditThemeId(undefined);
    setCloneFromTheme(theme);
    setEditorOpen(true);
  }, [theme]);

  const handleEditTheme = useCallback((themeId: string) => {
    setEditThemeId(themeId);
    setCloneFromTheme(undefined);
    setEditorOpen(true);
  }, []);

  const handleCloneTheme = useCallback((sourceTheme: string) => {
    setEditThemeId(undefined);
    setCloneFromTheme(sourceTheme);
    setEditorOpen(true);
  }, []);

  const requestDeleteTheme = useCallback((id: string, label: string) => {
    setThemeToDelete({ id, label });
  }, []);

  const confirmDeleteTheme = useCallback(() => {
    if (!themeToDelete) return;
    if (theme === themeToDelete.id) {
      setTheme('dark');
    }
    removeCustomThemeCSS(themeToDelete.id);
    deleteTheme(themeToDelete.id);
    toast.success(t('themes.toast.deleted'));
    setThemeToDelete(null);
  }, [themeToDelete, theme, setTheme, deleteTheme, t]);

  const customThemeOptions = getAllThemeOptions(customThemes).filter(opt => opt.isCustom);
  const clearPreview = useCallback(() => setPreviewTheme(null), [setPreviewTheme]);

  return {
    theme,
    uiFontScale,
    setTheme,
    setPreviewTheme,
    setUIFontScale,
    customThemeOptions,
    editorOpen,
    setEditorOpen,
    editThemeId,
    cloneFromTheme,
    themeToDelete,
    setThemeToDelete,
    handleCreateNew,
    handleEditTheme,
    handleCloneTheme,
    requestDeleteTheme,
    confirmDeleteTheme,
    clearPreview,
    importTheme,
    exportTheme,
  };
}
