// Anime types
export * from './types/anime';

// Settings types (BUILT_IN_THEMES is an internal lookup set used by
// isBuiltInTheme — kept off the public surface; consumers use isBuiltInTheme /
// BUILT_IN_THEME_METADATA instead)
export type {
  BuiltInTheme,
  Theme,
  CustomThemeDefinition,
  BuiltInThemeMeta,
} from './types/settings';
export {
  isBuiltInTheme,
  BUILT_IN_THEME_METADATA,
  DARK_THEMES,
  LIGHT_THEMES,
  DEFAULT_BUILT_IN_THEME,
  FEED_STARTUP_REFRESH_SETTING_KEY,
  DEFAULT_FEED_STARTUP_REFRESH,
  UI_FONT_SCALE_SETTING_KEY,
  DISPLAY_NAME_SETTING_KEY,
  DISPLAY_NAME_MAX_LENGTH,
  DEFAULT_UI_FONT_SCALE,
  MIN_UI_FONT_SCALE,
  MAX_UI_FONT_SCALE,
  UI_FONT_SCALE_PRESETS,
} from './types/settings';

// Diary types
export * from './types/diary';

// Import/Export types
export * from './types/import-export';

// Updater types
export * from './types/updater';

// Feed types
export * from './types/feed';

// System types
export * from './types/system';

// Local app stats types
export * from './types/stats';

// Electron API types (preload contract)
export * from './types/electron-api';

// Utilities
export * from './utils';

// Duration
export * from './duration';

// Formatters
export * from './formatters';

// Constants
export * from './constants';

// Logger
export * from './logger';

// Zod schemas (runtime validation for gateway payloads)
export * from './schemas';

// AniList error classification
export * from './anilist-errors';

// i18n contract (supported languages, storage keys)
export * from './i18n';
