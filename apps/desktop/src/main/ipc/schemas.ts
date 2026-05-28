/**
 * Zod tuple schemas for every IPC channel argument list.
 *
 * Each schema describes the *positional argument array* a renderer sends via
 * `ipcRenderer.invoke(channel, ...args)` / `ipcRenderer.send(channel, ...args)`.
 * Wrapped into `z.tuple([...])` so that `schema.safeParse(args)` validates both
 * arity and per-slot shape before the handler runs.
 *
 * Shared-type schemas below are intentionally partial at the IPC boundary:
 * renderers may send a `Partial<X>` for "update" operations, and we enforce
 * full shape for "add"/"set" operations where every field is required.
 */
import { z } from 'zod';

// ============================================================================
// Shared type schemas (inlined at the IPC boundary)
// ============================================================================

/** Mirrors {@link MessageDialogOptions} from `./types`. */
const messageDialogOptionsSchema = z.object({
  type: z.enum(['none', 'info', 'error', 'question', 'warning']).optional(),
  title: z.string().optional(),
  message: z.string(),
  detail: z.string().optional(),
  buttons: z.array(z.string()).optional(),
});

/** Mirrors {@link AnimeStatus} from `@shiroani/shared`. */
const animeStatusSchema = z.enum(['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']);

/** Mirrors {@link NotificationSubscription} from `@shiroani/shared`. */
const notificationSubscriptionSchema = z.object({
  anilistId: z.number().int(),
  title: z.string(),
  titleRomaji: z.string().optional(),
  coverImage: z.string().optional(),
  subscribedAt: z.string(),
  enabled: z.boolean(),
  source: z.enum(['schedule', 'library']),
  lastSeenAt: z.string().optional(),
});

/**
 * Partial of {@link NotificationSettings} — renderers patch individual fields
 * via `notifications:update-settings`, so every key is optional.
 */
const notificationSettingsPartialSchema = z
  .object({
    enabled: z.boolean(),
    leadTimeMinutes: z.number().int(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string(),
      end: z.string(),
    }),
    useSystemSound: z.boolean(),
    subscriptions: z.array(notificationSubscriptionSchema),
  })
  .partial();

/** Mirrors {@link DiscordPresenceTemplate} from `@shiroani/shared`. */
const discordPresenceTemplateSchema = z.object({
  details: z.string(),
  state: z.string(),
  showTimestamp: z.boolean(),
  showLargeImage: z.boolean(),
  showButton: z.boolean(),
});

/** Mirrors {@link DiscordActivityType} from `@shiroani/shared`. */
const discordActivityTypeSchema = z.enum([
  'watching',
  'browsing',
  'library',
  'diary',
  'schedule',
  'settings',
  'idle',
]);

/**
 * Partial of {@link DiscordRpcSettings} — renderers patch individual fields via
 * `discord-rpc:update-settings`, so every key is optional.
 */
const discordRpcSettingsPartialSchema = z
  .object({
    enabled: z.boolean(),
    showAnimeDetails: z.boolean(),
    showElapsedTime: z.boolean(),
    useCustomTemplates: z.boolean(),
    templates: z.record(discordActivityTypeSchema, discordPresenceTemplateSchema),
  })
  .partial();

/** Mirrors {@link DiscordPresenceActivity} from `@shiroani/shared`. */
const discordPresenceActivitySchema = z.object({
  view: z.string(),
  animeTitle: z.string().optional(),
  animeCoverUrl: z.string().optional(),
  anilistId: z.number().int().optional(),
  libraryCount: z.number().int().optional(),
  episodeNumber: z.string().optional(),
  siteName: z.string().optional(),
});

// ============================================================================
// Window channels
// ============================================================================

export const windowMinimizeSchema = z.tuple([]);
export const windowMaximizeSchema = z.tuple([]);
export const windowCloseSchema = z.tuple([]);
export const windowIsMaximizedSchema = z.tuple([]);
export const windowOpenDevtoolsSchema = z.tuple([]);

// ============================================================================
// Dialog channels
// ============================================================================

export const dialogOpenDirectorySchema = z.tuple([z.unknown()]);
export const dialogOpenFileSchema = z.tuple([z.unknown()]);
export const dialogSaveFileSchema = z.tuple([z.unknown()]);
export const dialogMessageSchema = z.tuple([messageDialogOptionsSchema]);

// ============================================================================
// Store channels
// ============================================================================

export const storeGetSchema = z.tuple([z.string().min(1)]);
export const storeSetSchema = z.tuple([z.string().min(1), z.unknown().nonoptional()]);
export const storeDeleteSchema = z.tuple([z.string().min(1)]);
export const storeClearSchema = z.tuple([]);

// ============================================================================
// App channels
// ============================================================================

export const appGetPathSchema = z.tuple([z.string()]);
export const appGetVersionSchema = z.tuple([]);
export const appGetSystemInfoSchema = z.tuple([]);
export const appOpenLogsFolderSchema = z.tuple([]);
export const appClipboardWriteSchema = z.tuple([z.string()]);
export const appFetchImageBase64Schema = z.tuple([z.string()]);
export const appClipboardWriteImageSchema = z.tuple([z.string()]);
export const appSaveFileBinarySchema = z.tuple([z.string().min(1), z.string()]);
export const appGetAutoLaunchSchema = z.tuple([]);
export const appSetAutoLaunchSchema = z.tuple([z.boolean()]);
export const appGetBackendPortSchema = z.tuple([]);
export const appListLogFilesSchema = z.tuple([]);
export const appLogWriteSchema = z.tuple([
  z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    context: z.string().min(1),
    message: z.string(),
    data: z.unknown().optional(),
  }),
]);
export const appSetLogLevelSchema = z.tuple([z.object({ level: z.string() })]);
export const appReadLogFileSchema = z.tuple([z.string()]);
export const appRelaunchSchema = z.tuple([]);
export const appClearUserFilesSchema = z.tuple([]);

// ============================================================================
// Updater channels
// ============================================================================

export const updaterCheckForUpdatesSchema = z.tuple([]);
export const updaterStartDownloadSchema = z.tuple([]);
export const updaterInstallNowSchema = z.tuple([]);
export const updaterGetChannelSchema = z.tuple([]);
export const updaterSetChannelSchema = z.tuple([z.enum(['stable', 'beta'])]);

// ============================================================================
// Browser channels
// ============================================================================

export const browserToggleAdblockSchema = z.tuple([z.boolean()]);
export const browserSetFullscreenSchema = z.tuple([z.boolean()]);
export const browserGetPopupBlockEnabledSchema = z.tuple([]);
export const browserSetPopupBlockEnabledSchema = z.tuple([z.boolean()]);
export const browserSetAdblockWhitelistSchema = z.tuple([z.unknown()]);
export const browserClearSessionSchema = z.tuple([]);

// ============================================================================
// Background channels
// ============================================================================

export const backgroundPickSchema = z.tuple([]);
export const backgroundRemoveSchema = z.tuple([z.string().min(1)]);
export const backgroundGetUrlSchema = z.tuple([z.string().min(1)]);

// ============================================================================
// Sprite channels (custom mascot sprite)
// ============================================================================

export const spritePickSchema = z.tuple([]);
export const spriteRemoveSchema = z.tuple([z.string().min(1)]);
export const spriteGetUrlSchema = z.tuple([z.string().min(1)]);
/**
 * Permissive on the IPC boundary; the handler validates the literal value
 * and throws BAD_REQUEST when it's not one of `contain | cover | stretch`.
 * Mirrors the visibility-mode pattern in {@link overlaySetVisibilityModeSchema}.
 */
export const spriteSetScaleModeSchema = z.tuple([z.unknown()]);

// ============================================================================
// Notifications channels
// ============================================================================

export const notificationsGetSettingsSchema = z.tuple([]);
export const notificationsUpdateSettingsSchema = z.tuple([notificationSettingsPartialSchema]);
export const notificationsGetSubscriptionsSchema = z.tuple([]);
export const notificationsAddSubscriptionSchema = z.tuple([notificationSubscriptionSchema]);
export const notificationsRemoveSubscriptionSchema = z.tuple([z.number().int()]);
export const notificationsToggleSubscriptionSchema = z.tuple([z.number().int()]);
export const notificationsIsSubscribedSchema = z.tuple([z.number().int()]);

// ============================================================================
// File channels
// ============================================================================

export const fileWriteJsonSchema = z.tuple([z.string().min(1), z.string()]);
export const fileReadJsonSchema = z.tuple([z.string().min(1)]);

// ============================================================================
// Overlay channels
// ============================================================================

export const overlayShowSchema = z.tuple([]);
export const overlayHideSchema = z.tuple([]);
export const overlayToggleSchema = z.tuple([]);
export const overlayGetStatusSchema = z.tuple([]);
export const overlayIsEnabledSchema = z.tuple([]);
export const overlayGetSizeSchema = z.tuple([]);
export const overlayGetVisibilityModeSchema = z.tuple([]);
export const overlayGetPositionLockedSchema = z.tuple([]);
export const overlayResetPositionSchema = z.tuple([]);
export const overlaySetPositionSchema = z.tuple([z.number().finite(), z.number().finite()]);
export const overlaySetEnabledSchema = z.tuple([z.boolean()]);
export const overlaySetSizeSchema = z.tuple([z.number().finite()]);
export const overlaySetVisibilityModeSchema = z.tuple([z.enum(['always', 'tray-only'])]);
export const overlaySetPositionLockedSchema = z.tuple([z.boolean()]);
export const overlaySetAnimationEnabledSchema = z.tuple([z.boolean()]);
export const overlayGetAnimationEnabledSchema = z.tuple([]);

// ============================================================================
// Discord RPC channels
// ============================================================================

export const discordRpcGetSettingsSchema = z.tuple([]);
export const discordRpcUpdateSettingsSchema = z.tuple([discordRpcSettingsPartialSchema]);
export const discordRpcUpdatePresenceSchema = z.tuple([discordPresenceActivitySchema]);
export const discordRpcClearPresenceSchema = z.tuple([]);

// ============================================================================
// App stats channels
// ============================================================================

export const appStatsGetSnapshotSchema = z.tuple([]);
export const appStatsSetWatchingAnimeSchema = z.tuple([z.boolean()]);
export const appStatsResetSchema = z.tuple([]);

// Re-export shared-type schemas for handlers that compose them elsewhere.
export {
  messageDialogOptionsSchema,
  animeStatusSchema,
  notificationSubscriptionSchema,
  notificationSettingsPartialSchema,
  discordPresenceTemplateSchema,
  discordActivityTypeSchema,
  discordRpcSettingsPartialSchema,
  discordPresenceActivitySchema,
};
