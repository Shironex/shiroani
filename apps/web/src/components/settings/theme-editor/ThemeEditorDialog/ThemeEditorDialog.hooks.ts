import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { themeOptions, getThemeOption } from '@/lib/theme';
import {
  injectCustomThemeCSS,
  removeCustomThemeCSS,
  extractThemeVariables,
} from '@/lib/custom-theme-css';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import {
  VARIABLE_GROUPS,
  TEMP_THEME_ID,
} from '@/components/settings/theme-editor/theme-variable-groups';
import type { BuiltInTheme, CustomThemeDefinition } from '@shiroani/shared';
import type { IThemeEditorDialogProps, IThemeEditorDialogView } from './ThemeEditorDialog.types';

/**
 * Owns the theme-editor dialog: form state, the live-preview injection effect,
 * initialization on open (edit vs. clone), and the save/cancel/reset handlers.
 */
export function useThemeEditorDialog({
  open,
  onOpenChange,
  editThemeId,
  cloneFromTheme,
}: IThemeEditorDialogProps): IThemeEditorDialogView {
  const { t } = useTranslation('settings');
  const setTheme = useSettingsStore(s => s.setTheme);

  const makeDefaultName = useCallback(
    (cloneLabel?: string): string =>
      cloneLabel
        ? t('themes.editor.cloneNamePrefix', { label: cloneLabel })
        : t('themes.editor.defaultName'),
    [t]
  );

  const variableGroups = useMemo(
    () =>
      VARIABLE_GROUPS.map(g => ({
        ...g,
        label: t(`themes.editor.groups.${g.labelKey}`),
      })),
    [t]
  );

  // Track what theme was active before opening so we can revert on cancel
  const previousThemeRef = useRef<string>('');

  // ── State ──

  const [name, setName] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [baseTheme, setBaseTheme] = useState<BuiltInTheme>('plum');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [initialVariables, setInitialVariables] = useState<Record<string, string>>({});

  // ── Initialize on open ──

  useEffect(() => {
    if (!open) return;

    previousThemeRef.current = useSettingsStore.getState().theme;

    if (editThemeId) {
      // Editing existing custom theme
      const existing = useCustomThemeStore.getState().getTheme(editThemeId);
      if (existing) {
        setName(existing.name);
        setIsDark(existing.isDark);
        setBaseTheme(existing.baseTheme);
        setVariables({ ...existing.variables });
        setInitialVariables({ ...existing.variables });
      }
    } else {
      // New theme — clone from base
      const sourceTheme = cloneFromTheme || useSettingsStore.getState().theme;
      const sourceOption = getThemeOption(sourceTheme);
      const cloneLabel = sourceOption?.label;

      setName(makeDefaultName(cloneLabel));
      setIsDark(sourceOption?.isDark ?? true);
      const isBuiltIn = cloneFromTheme && themeOptions.some(o => o.value === cloneFromTheme);
      setBaseTheme(
        isBuiltIn ? (cloneFromTheme as BuiltInTheme) : sourceOption?.isDark ? 'plum' : 'haiku'
      );

      const extracted = extractThemeVariables(sourceTheme);
      setVariables({ ...extracted });
      setInitialVariables({ ...extracted });
    }
  }, [open, editThemeId, cloneFromTheme]);

  // ── Live preview ──

  useEffect(() => {
    if (!open) return;

    // Build a partial CustomThemeDefinition for preview injection
    injectCustomThemeCSS(TEMP_THEME_ID, variables);
    // Apply the temp theme class to see changes
    const root = document.documentElement;
    root.classList.add(TEMP_THEME_ID);

    return () => {
      root.classList.remove(TEMP_THEME_ID);
      removeCustomThemeCSS(TEMP_THEME_ID);
    };
  }, [open, baseTheme, variables]);

  // ── Handlers ──

  const handleVariableChange = useCallback((varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  }, []);

  const handleBaseThemeChange = useCallback((newBase: string) => {
    setBaseTheme(newBase as BuiltInTheme);
    const baseOption = getThemeOption(newBase);
    if (baseOption) {
      setIsDark(baseOption.isDark);
    }
    // Remove preview CSS before extracting, so it doesn't override the base theme's values
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    const extracted = extractThemeVariables(newBase);
    setVariables({ ...extracted });
    setInitialVariables({ ...extracted });
    // Live preview effect will re-inject on next render
  }, []);

  const handleReset = useCallback(() => {
    setVariables({ ...initialVariables });
  }, [initialVariables]);

  const handleCancel = useCallback(() => {
    // Remove preview and restore previous theme
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    // Restore previous theme class
    if (previousThemeRef.current) {
      setTheme(previousThemeRef.current);
    }

    onOpenChange(false);
  }, [onOpenChange, setTheme]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t('themes.editor.toast.nameRequired'));
      return;
    }

    // Determine the primary color from variables (use brand-500 or primary)
    const primaryColor = variables['primary'] || '#6366f1';

    // Clean up preview
    const root = document.documentElement;
    root.classList.remove(TEMP_THEME_ID);
    removeCustomThemeCSS(TEMP_THEME_ID);

    if (editThemeId) {
      // Update existing theme
      useCustomThemeStore.getState().updateTheme(editThemeId, {
        name: trimmedName,
        baseTheme,
        isDark,
        color: primaryColor,
        variables,
      });
      setTheme(editThemeId);
      toast.success(t('themes.editor.toast.changesSaved'));
    } else {
      // Create new theme
      const newTheme: Omit<CustomThemeDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
        name: trimmedName,
        baseTheme,
        isDark,
        color: primaryColor,
        variables,
      };
      const created = useCustomThemeStore.getState().addTheme(newTheme);
      if (created) {
        setTheme(created.id);
      }
      toast.success(t('themes.editor.toast.saved'));
    }

    onOpenChange(false);
  }, [name, baseTheme, isDark, variables, editThemeId, onOpenChange, setTheme, t]);

  const isEditing = !!editThemeId;
  const dialogTitle = isEditing ? t('themes.editor.editTitle') : t('themes.editor.newTitle');

  return {
    name,
    setName,
    isDark,
    setIsDark,
    baseTheme,
    variables,
    variableGroups,
    handleVariableChange,
    handleBaseThemeChange,
    handleReset,
    handleCancel,
    handleSave,
    isEditing,
    dialogTitle,
  };
}
