import { create } from 'zustand';
import { maybeDevtools } from '@/stores/utils/maybeDevtools';
import type { Theme } from '@shiroani/shared';
import {
  createLogger,
  DEFAULT_UI_FONT_SCALE,
  DISPLAY_NAME_MAX_LENGTH,
  DISPLAY_NAME_SETTING_KEY,
  isBuiltInTheme,
  UI_FONT_SCALE_SETTING_KEY,
} from '@shiroani/shared';
import { themeOptions } from '@/lib/theme';
import { persistTheme, getPersistedTheme } from '@/lib/theme-persistence';
import { injectCustomThemeCSS, removeCustomThemeCSS } from '@/lib/custom-theme-css';
import { electronStoreGet, electronStoreSet } from '@/lib/electron-store';
import { createLocalStorageAccessor } from '@/lib/persisted-storage';
import {
  applyUIFontScaleToDOM,
  clampUIFontScale,
  getPersistedUIFontScale,
  persistUIFontScaleLocally,
} from '@/lib/ui-font-scale';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';

const logger = createLogger('Settings');

/**
 * Settings state
 */
interface SettingsState {
  /** Current theme */
  theme: Theme;
  /** Preview theme (for hover preview) */
  previewTheme: Theme | null;
  /** Readability scale applied to UI typography/layout tokens */
  uiFontScale: number;
  /** Preferred language for anime titles/subtitles */
  preferredLanguage: 'japanese' | 'english' | 'romaji';
  /** How the app addresses the user (e.g. the newtab greeting). Empty means "no personalised name". */
  displayName: string;
  /** Developer mode — surfaces DevTools, diagnostics copy, and the log viewer. */
  devModeEnabled: boolean;
}

/**
 * Settings actions
 */
interface SettingsActions {
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Set preview theme (for hover) */
  setPreviewTheme: (theme: Theme | null) => void;
  /** Set UI font scale */
  setUIFontScale: (scale: number) => void;
  /** Set preferred language */
  setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => void;
  /** Set the user's display name. Trimmed + clamped to DISPLAY_NAME_MAX_LENGTH. */
  setDisplayName: (name: string) => void;
  /** Toggle developer mode — persisted across sessions. */
  setDevModeEnabled: (enabled: boolean) => void;
  /** Initialize persisted visual settings */
  initSettings: () => Promise<void>;
}

const DISPLAY_NAME_STORAGE_KEY = 'shiroani:displayName';
const DEV_MODE_STORAGE_KEY = 'shiroani:devMode';
const DEV_MODE_SETTING_KEY = 'settings.devMode';

// Stored as the string `'true'`; any other value (including missing keys left
// over from the old removeItem-on-disable shape) reads as disabled.
const devModeStorage = createLocalStorageAccessor<boolean>(DEV_MODE_STORAGE_KEY, {
  parse: raw => raw === 'true',
  serialize: enabled => (enabled ? 'true' : ''),
  fallback: false,
});

const displayNameStorage = createLocalStorageAccessor<string>(DISPLAY_NAME_STORAGE_KEY, {
  parse: raw => raw,
  serialize: value => value,
  fallback: '',
});

function getPersistedDevMode(): boolean {
  return devModeStorage.get();
}

function persistDevModeLocally(enabled: boolean) {
  devModeStorage.set(enabled);
}

function getPersistedDisplayName(): string {
  return displayNameStorage.get();
}

function persistDisplayNameLocally(name: string) {
  displayNameStorage.set(name);
}

function normalizeDisplayName(name: string): string {
  return name.trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
}

/**
 * Combined store type
 */
type SettingsStore = SettingsState & SettingsActions;

/**
 * Track the currently-applied theme class so we can always remove it.
 */
let currentThemeClass: string | null = null;

/**
 * If the persisted theme is a custom theme that hasn't loaded yet,
 * store its ID here so we can apply it once the custom theme store loads.
 */
let pendingCustomTheme: string | null = null;
let settingsInitPromise: Promise<void> | null = null;

/**
 * Apply theme class to document element.
 * Handles both built-in and custom themes.
 */
function applyThemeToDOM(theme: Theme) {
  logger.debug('applyThemeToDOM:', theme);
  const root = document.documentElement;
  const previousTheme = currentThemeClass;

  // Remove the previously tracked theme class
  if (previousTheme) {
    root.classList.remove(previousTheme);
  }

  // Also remove all known built-in theme classes (safety net for initial load)
  const allThemeClasses = themeOptions.map(t => t.value);
  root.classList.remove(...allThemeClasses);

  // Clean up custom CSS if switching away from a custom theme
  if (previousTheme && !isBuiltInTheme(previousTheme) && previousTheme !== theme) {
    removeCustomThemeCSS(previousTheme);
    root.classList.remove('dark');
  }

  // Add the theme class
  root.classList.add(theme);
  currentThemeClass = theme;

  // Apply custom theme CSS variables if this is a custom theme
  if (!isBuiltInTheme(theme)) {
    const definition = useCustomThemeStore.getState().getTheme(theme);
    if (definition) {
      injectCustomThemeCSS(theme, definition.variables);
      if (definition.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      logger.warn('Custom theme definition not found:', theme);
    }
  }
}

// Default theme — matches DEFAULT_BUILT_IN_THEME in shared settings types
const DEFAULT_THEME: Theme = 'plum';

/**
 * Settings store using Zustand
 */
export const useSettingsStore = create<SettingsStore>()(
  maybeDevtools(
    (set, get) => {
      // Resolve initial theme from localStorage (instant) or fall back to default.
      // Validate against known built-in themes and custom themes.
      const persisted = typeof document !== 'undefined' ? getPersistedTheme() : DEFAULT_THEME;
      const isBuiltIn = themeOptions.some(t => t.value === persisted);
      const customThemeStore = useCustomThemeStore.getState();
      const isCustom = !isBuiltIn && customThemeStore.customThemes.some(t => t.id === persisted);
      const isValidTheme = isBuiltIn || isCustom;

      // If the persisted theme is not recognized, it may be a custom theme whose
      // store hasn't loaded yet. Store the ID so we can apply it once loaded.
      let initialTheme: Theme;
      if (isValidTheme) {
        initialTheme = persisted as Theme;
      } else if (!isBuiltIn && persisted !== DEFAULT_THEME) {
        // Potentially a custom theme that will load later — use default for now
        // and set up a listener to apply the custom theme when it becomes available
        initialTheme = DEFAULT_THEME;
        pendingCustomTheme = persisted;
      } else {
        initialTheme = DEFAULT_THEME;
      }

      // Apply initial theme on store initialization
      if (typeof document !== 'undefined') {
        applyThemeToDOM(initialTheme);
      }

      const initialFontScale =
        typeof document !== 'undefined' ? getPersistedUIFontScale() : DEFAULT_UI_FONT_SCALE;

      if (typeof document !== 'undefined') {
        applyUIFontScaleToDOM(initialFontScale);
      }

      const initialDisplayName = typeof window !== 'undefined' ? getPersistedDisplayName() : '';
      const initialDevMode = typeof window !== 'undefined' ? getPersistedDevMode() : false;

      return {
        // Initial state
        theme: initialTheme,
        previewTheme: null,
        uiFontScale: initialFontScale,
        preferredLanguage: 'romaji',
        displayName: initialDisplayName,
        devModeEnabled: initialDevMode,

        // Actions
        setTheme: (theme: Theme) => {
          logger.debug('setTheme', theme);
          set({ theme, previewTheme: null }, undefined, 'settings/setTheme');
          applyThemeToDOM(theme);
          persistTheme(theme);
        },

        setPreviewTheme: (theme: Theme | null) => {
          const state = get();
          set({ previewTheme: theme }, undefined, 'settings/setPreviewTheme');

          if (theme) {
            applyThemeToDOM(theme);
          } else {
            // Restore actual theme when preview ends
            applyThemeToDOM(state.theme);
          }
        },

        setUIFontScale: (scale: number) => {
          const next = clampUIFontScale(scale);
          logger.debug('setUIFontScale', next);
          set({ uiFontScale: next }, undefined, 'settings/setUIFontScale');
          applyUIFontScaleToDOM(next);
          persistUIFontScaleLocally(next);
          void electronStoreSet(UI_FONT_SCALE_SETTING_KEY, next).catch(error => {
            logger.warn('Failed to persist UI font scale:', error);
          });
        },

        setPreferredLanguage: (lang: 'japanese' | 'english' | 'romaji') => {
          logger.debug('setPreferredLanguage', lang);
          set({ preferredLanguage: lang }, undefined, 'settings/setPreferredLanguage');
        },

        setDisplayName: (name: string) => {
          const next = normalizeDisplayName(name);
          if (get().displayName === next) return;
          logger.debug('setDisplayName', next ? `"${next}"` : '(empty)');
          set({ displayName: next }, undefined, 'settings/setDisplayName');
          persistDisplayNameLocally(next);
          void electronStoreSet(DISPLAY_NAME_SETTING_KEY, next).catch(error => {
            logger.warn('Failed to persist display name:', error);
          });
        },

        setDevModeEnabled: (enabled: boolean) => {
          if (get().devModeEnabled === enabled) return;
          logger.debug('setDevModeEnabled', enabled);
          set({ devModeEnabled: enabled }, undefined, 'settings/setDevModeEnabled');
          persistDevModeLocally(enabled);
          void electronStoreSet(DEV_MODE_SETTING_KEY, enabled).catch(error => {
            logger.warn('Failed to persist dev mode:', error);
          });
        },

        initSettings: async () => {
          logger.debug('initSettings');
          if (settingsInitPromise) {
            return settingsInitPromise;
          }

          const initialScale = get().uiFontScale;
          const initialName = get().displayName;
          settingsInitPromise = (async () => {
            await Promise.all([
              useBackgroundStore.getState().restoreBackground(),
              useMascotSpriteStore.getState().restoreSprite(),
            ]);

            try {
              const persistedScale = await electronStoreGet<number>(UI_FONT_SCALE_SETTING_KEY);
              if (typeof persistedScale === 'number' && get().uiFontScale === initialScale) {
                const next = clampUIFontScale(persistedScale);
                set({ uiFontScale: next }, undefined, 'settings/initUIFontScale');
                applyUIFontScaleToDOM(next);
                persistUIFontScaleLocally(next);
              }
            } catch (error) {
              logger.warn('Failed to restore UI font scale:', error);
            }

            try {
              const persistedName = await electronStoreGet<string>(DISPLAY_NAME_SETTING_KEY);
              if (
                typeof persistedName === 'string' &&
                get().displayName === initialName &&
                persistedName !== initialName
              ) {
                const next = normalizeDisplayName(persistedName);
                set({ displayName: next }, undefined, 'settings/initDisplayName');
                persistDisplayNameLocally(next);
              }
            } catch (error) {
              logger.warn('Failed to restore display name:', error);
            }

            try {
              const persistedDevMode = await electronStoreGet<boolean>(DEV_MODE_SETTING_KEY);
              if (
                typeof persistedDevMode === 'boolean' &&
                persistedDevMode !== get().devModeEnabled
              ) {
                set({ devModeEnabled: persistedDevMode }, undefined, 'settings/initDevMode');
                persistDevModeLocally(persistedDevMode);
              }
            } catch (error) {
              logger.warn('Failed to restore dev mode:', error);
            }
          })().catch(error => {
            settingsInitPromise = null;
            throw error;
          });

          return settingsInitPromise;
        },
      };
    },
    { name: 'settings' }
  )
);

// Subscribe to custom theme store to apply pending custom theme once loaded
if (typeof document !== 'undefined') {
  useCustomThemeStore.subscribe(state => {
    if (pendingCustomTheme && state.customThemes.some(t => t.id === pendingCustomTheme)) {
      const themeId = pendingCustomTheme as Theme;
      pendingCustomTheme = null;
      useSettingsStore.getState().setTheme(themeId);
    }
  });
}

// Selectors

/**
 * Select current theme
 */
export const selectTheme = (state: SettingsStore) => state.theme;

/**
 * Select preview theme
 */
export const selectPreviewTheme = (state: SettingsStore) => state.previewTheme;

/**
 * Select effective theme (preview or actual)
 */
export const selectEffectiveTheme = (state: SettingsStore) => state.previewTheme ?? state.theme;
