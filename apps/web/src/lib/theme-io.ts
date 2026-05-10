/**
 * Theme import/export utilities — pure helpers extracted from the custom theme store.
 */
import { createLogger, isBuiltInTheme } from '@shiroani/shared';
import type { CustomThemeDefinition } from '@shiroani/shared';
import i18n from '@/lib/i18n';
import { THEME_VARIABLE_NAMES } from '@/lib/custom-theme-css';

const logger = createLogger('ThemeIO');

const STORE_KEY = 'custom-themes';

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function persistThemes(themes: CustomThemeDefinition[]): Promise<void> {
  try {
    if (window.electronAPI?.store) {
      await window.electronAPI.store.set(STORE_KEY, themes);
    } else {
      localStorage.setItem(STORE_KEY, JSON.stringify(themes));
    }
  } catch (err) {
    logger.warn('Failed to persist custom themes:', err);
  }
}

export async function loadPersistedThemes(): Promise<CustomThemeDefinition[]> {
  try {
    if (window.electronAPI?.store) {
      const data = await window.electronAPI.store.get<CustomThemeDefinition[]>(STORE_KEY);
      return Array.isArray(data) ? data : [];
    } else {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    logger.warn('Failed to load custom themes:', err);
    return [];
  }
}

// ─── Import / Export format ───────────────────────────────────────────────────

/** The file format for theme import/export */
export interface ThemeExportFormat {
  version: 1;
  type: 'shiroani-custom-theme';
  theme: {
    name: string;
    baseTheme: string;
    isDark: boolean;
    color: string;
    variables: Record<string, string>;
  };
}

// ─── Validation & sanitization ────────────────────────────────────────────────

/** Sanitize a theme name for use as a file name */
export function sanitizeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50) || 'motyw'
  );
}

/**
 * Validate an imported theme JSON against the expected format.
 * Returns an error message if invalid, or null if valid.
 *
 * The single shared "invalid file" message is resolved through i18n at every
 * return site so the toast that surfaces it tracks the active UI language.
 * Stores can't use the `useTranslation` hook, so we lean on the singleton
 * i18n instance here — the same pattern used by the four toast-emitting
 * stores in apps/web/src/stores.
 */
export function validateImportData(data: unknown): string | null {
  const invalidMessage = () => i18n.t('settings:themes.toast.invalidFile');

  if (!data || typeof data !== 'object') {
    return invalidMessage();
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== 1 || obj.type !== 'shiroani-custom-theme') {
    return invalidMessage();
  }

  if (!obj.theme || typeof obj.theme !== 'object') {
    return invalidMessage();
  }

  const theme = obj.theme as Record<string, unknown>;

  if (typeof theme.name !== 'string' || theme.name.trim().length === 0) {
    return invalidMessage();
  }

  if (typeof theme.baseTheme !== 'string' || !isBuiltInTheme(theme.baseTheme)) {
    return invalidMessage();
  }

  if (typeof theme.isDark !== 'boolean') {
    return invalidMessage();
  }

  if (typeof theme.color !== 'string') {
    return invalidMessage();
  }

  if (!theme.variables || typeof theme.variables !== 'object') {
    return invalidMessage();
  }

  const validNames = new Set<string>(THEME_VARIABLE_NAMES);
  const variables = theme.variables as Record<string, unknown>;
  for (const [key, val] of Object.entries(variables)) {
    if (!validNames.has(key)) {
      return invalidMessage();
    }
    if (typeof val !== 'string') {
      return invalidMessage();
    }
  }

  return null;
}

// ─── Web fallback I/O ─────────────────────────────────────────────────────────

/** Web-only fallback: export via Blob download */
export function webExportFallback(exportData: ThemeExportFormat, fileName: string): void {
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Web-only fallback: import via hidden file input */
export function webImportFallback(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        input.remove();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
        input.remove();
      };
      reader.onerror = () => {
        resolve(null);
        input.remove();
      };
      reader.readAsText(file);
    });

    input.addEventListener('cancel', () => {
      resolve(null);
      input.remove();
    });

    document.body.appendChild(input);
    input.click();
  });
}
