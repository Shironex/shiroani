import type { DiscordPresenceTemplates, DiscordActivityType } from '../types/anime';

export const DISCORD_ACTIVITY_TYPES: DiscordActivityType[] = [
  'watching',
  'browsing',
  'library',
  'diary',
  'schedule',
  'settings',
  'idle',
];

/**
 * Sentinel prefix marking a string that is a translation key path rather than
 * a literal user-facing string. Default templates and labels ship with these
 * sentinels so the runtime (main process or renderer) can resolve them in
 * the user's active UI language. User-customised template strings are stored
 * verbatim and never carry the sentinel — they pass through {@link resolveLocalizedTemplateField}
 * unchanged.
 */
export const DISCORD_TEMPLATE_KEY_PREFIX = '@@i18n:';

/**
 * Resolve a template field that may be either a key reference (`@@i18n:<path>`)
 * or a literal string. Literal user input (and empty strings) are returned
 * as-is; sentinels are passed to the supplied translator. The translator is
 * not given the sentinel — only the key path that follows it.
 */
export function resolveLocalizedTemplateField(
  value: string,
  translate: (key: string) => string
): string {
  if (!value.startsWith(DISCORD_TEMPLATE_KEY_PREFIX)) return value;
  return translate(value.slice(DISCORD_TEMPLATE_KEY_PREFIX.length));
}

export const DISCORD_ACTIVITY_LABELS: Record<DiscordActivityType, string> = {
  watching: '@@i18n:discord.activityLabel.watching',
  browsing: '@@i18n:discord.activityLabel.browsing',
  library: '@@i18n:discord.activityLabel.library',
  diary: '@@i18n:discord.activityLabel.diary',
  schedule: '@@i18n:discord.activityLabel.schedule',
  settings: '@@i18n:discord.activityLabel.settings',
  idle: '@@i18n:discord.activityLabel.idle',
};

/** Variables available for template substitution */
export const DISCORD_TEMPLATE_VARIABLES = [
  { key: '{anime_title}', description: '@@i18n:discord.templateVariable.animeTitle' },
  { key: '{episode}', description: '@@i18n:discord.templateVariable.episode' },
  { key: '{site_name}', description: '@@i18n:discord.templateVariable.siteName' },
  { key: '{library_count}', description: '@@i18n:discord.templateVariable.libraryCount' },
] as const;

export const DEFAULT_DISCORD_TEMPLATES: DiscordPresenceTemplates = {
  watching: {
    details: '@@i18n:discord.template.watching.details',
    state: '{anime_title}',
    showTimestamp: true,
    showLargeImage: true,
    showButton: true,
  },
  browsing: {
    details: '@@i18n:discord.template.browsing.details',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  library: {
    details: '@@i18n:discord.template.library.details',
    state: '{library_count} anime',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  diary: {
    details: '@@i18n:discord.template.diary.details',
    state: '{anime_title}',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  schedule: {
    details: '@@i18n:discord.template.schedule.details',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  settings: {
    details: '@@i18n:discord.template.settings.details',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
  idle: {
    details: '@@i18n:discord.template.idle.details',
    state: '',
    showTimestamp: true,
    showLargeImage: true,
    showButton: false,
  },
};
