/**
 * Custom theme store — manages user-created themes with electron-store persistence
 * and localStorage fallback for web builds.
 */
import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import { toast } from 'sonner';
import { createLogger } from '@shiroani/shared';
import type { CustomThemeDefinition, BuiltInTheme } from '@shiroani/shared';
import i18n from '@/lib/i18n';
import {
  persistThemes,
  loadPersistedThemes,
  validateImportData,
  sanitizeFileName,
  webExportFallback,
  webImportFallback,
  type ThemeExportFormat,
} from '@/lib/theme-io';

const logger = createLogger('CustomThemeStore');

const MAX_THEMES = 50;

// ─── State & Actions ─────────────────────────────────────────────────────────

interface CustomThemeState {
  /** All user-created themes */
  customThemes: CustomThemeDefinition[];
  /** Whether themes have been loaded from persistence */
  loaded: boolean;
}

interface CustomThemeActions {
  /** Load themes from persistence (electron-store or localStorage) */
  loadThemes: () => Promise<void>;
  /** Add a new custom theme (id, createdAt, updatedAt are generated automatically) */
  addTheme: (
    theme: Omit<CustomThemeDefinition, 'id' | 'createdAt' | 'updatedAt'>
  ) => CustomThemeDefinition | null;
  /** Update an existing custom theme by ID */
  updateTheme: (id: string, updates: Partial<CustomThemeDefinition>) => void;
  /** Delete a custom theme by ID */
  deleteTheme: (id: string) => void;
  /** Get a custom theme by ID */
  getTheme: (id: string) => CustomThemeDefinition | undefined;
  /** Export a custom theme to a JSON file */
  exportTheme: (id: string) => Promise<void>;
  /** Import a custom theme from a JSON file */
  importTheme: () => Promise<void>;
}

type CustomThemeStore = CustomThemeState & CustomThemeActions;

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCustomThemeStore = create<CustomThemeStore>()(
  maybeDevtools(
    (set, get) => ({
      // Initial state
      customThemes: [],
      loaded: false,

      // Actions
      loadThemes: async () => {
        logger.debug('loadThemes');
        const themes = await loadPersistedThemes();
        set({ customThemes: themes, loaded: true }, undefined, 'customThemes/load');
        logger.info(`Loaded ${themes.length} custom theme(s)`);
      },

      addTheme: theme => {
        const state = get();
        if (state.customThemes.length >= MAX_THEMES) {
          logger.warn(`Cannot add theme: maximum of ${MAX_THEMES} custom themes reached`);
          return null;
        }

        const now = Date.now();
        const newTheme: CustomThemeDefinition = {
          ...theme,
          id: `custom-${now}`,
          createdAt: now,
          updatedAt: now,
        };

        const updated = [...state.customThemes, newTheme];
        set({ customThemes: updated }, undefined, 'customThemes/add');
        persistThemes(updated);

        logger.info(`Added custom theme: ${newTheme.name} (${newTheme.id})`);
        return newTheme;
      },

      updateTheme: (id, updates) => {
        const state = get();
        const index = state.customThemes.findIndex(t => t.id === id);
        if (index === -1) {
          logger.warn(`Cannot update theme: ${id} not found`);
          return;
        }

        const updated = [...state.customThemes];
        updated[index] = {
          ...updated[index],
          ...updates,
          id, // prevent overwriting ID
          updatedAt: Date.now(),
        };

        set({ customThemes: updated }, undefined, 'customThemes/update');
        persistThemes(updated);

        logger.debug(`Updated custom theme: ${id}`);
      },

      deleteTheme: id => {
        const state = get();
        const updated = state.customThemes.filter(t => t.id !== id);

        if (updated.length === state.customThemes.length) {
          logger.warn(`Cannot delete theme: ${id} not found`);
          return;
        }

        set({ customThemes: updated }, undefined, 'customThemes/delete');
        persistThemes(updated);

        logger.info(`Deleted custom theme: ${id}`);
      },

      getTheme: id => {
        return get().customThemes.find(t => t.id === id);
      },

      exportTheme: async (id: string) => {
        try {
          const theme = get().getTheme(id);
          if (!theme) {
            toast.error(i18n.t('settings:themes.toast.notFound'));
            return;
          }

          const exportData: ThemeExportFormat = {
            version: 1,
            type: 'shiroani-custom-theme',
            theme: {
              name: theme.name,
              baseTheme: theme.baseTheme,
              isDark: theme.isDark,
              color: theme.color,
              variables: theme.variables,
            },
          };

          const fileName = `${sanitizeFileName(theme.name)}.json`;

          // Electron path: native save dialog + file write
          if (window.electronAPI?.dialog?.saveFile && window.electronAPI?.file?.writeJson) {
            const filePath = await window.electronAPI.dialog.saveFile({
              title: 'Eksportuj motyw',
              defaultPath: fileName,
              filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (!filePath) return; // User cancelled

            const jsonString = JSON.stringify(exportData, null, 2);
            await window.electronAPI.file.writeJson(filePath, jsonString);
            toast.success(i18n.t('settings:themes.toast.exported'));
          } else {
            // Web fallback: Blob download
            webExportFallback(exportData, fileName);
            toast.success(i18n.t('settings:themes.toast.exported'));
          }
        } catch (err) {
          logger.error('Failed to export theme:', err);
          toast.error(i18n.t('settings:themes.toast.exportFailed'));
        }
      },

      importTheme: async () => {
        try {
          let raw: string | null = null;

          // Electron path: native open dialog + file read
          if (window.electronAPI?.dialog?.openFile && window.electronAPI?.file?.readJson) {
            const filePath = await window.electronAPI.dialog.openFile({
              title: 'Importuj motyw',
              filters: [{ name: 'JSON', extensions: ['json'] }],
            });

            if (!filePath) return; // User cancelled

            raw = await window.electronAPI.file.readJson(filePath);
          } else {
            // Web fallback: file input
            raw = await webImportFallback();
          }

          if (!raw) return;

          let data: unknown;
          try {
            data = JSON.parse(raw);
          } catch {
            toast.error(i18n.t('settings:themes.toast.invalidFile'));
            return;
          }

          const validationError = validateImportData(data);
          if (validationError) {
            toast.error(validationError);
            return;
          }

          const importData = data as ThemeExportFormat;

          // Check theme limit before adding
          if (get().customThemes.length >= MAX_THEMES) {
            toast.error(i18n.t('settings:themes.toast.limitReached', { limit: MAX_THEMES }));
            return;
          }

          const result = get().addTheme({
            name: importData.theme.name,
            baseTheme: importData.theme.baseTheme as BuiltInTheme,
            isDark: importData.theme.isDark,
            color: importData.theme.color,
            variables: importData.theme.variables,
          });

          if (result) {
            toast.success(i18n.t('settings:themes.toast.imported'));
          }
        } catch (err) {
          logger.error('Failed to import theme:', err);
          toast.error(i18n.t('settings:themes.toast.importFailed'));
        }
      },
    }),
    { name: 'custom-themes' }
  )
);
