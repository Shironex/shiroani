import { ipcMain } from 'electron';
import { UI_LANGUAGE_SETTING_KEY } from '@shiroani/shared';
import { createMainLogger } from '../logging/logger';
import { store } from '../store';
import { rebuildTrayMenu } from '../tray';
import { handle, handleWithFallback } from './with-ipc-handler';
import { storeGetSchema, storeSetSchema, storeDeleteSchema } from './schemas';

const logger = createMainLogger('IPC:Store');

/**
 * Security: Whitelist of allowed store keys
 * Only these keys can be read/written from the renderer process
 */
const ALLOWED_STORE_KEYS = new Set([
  // Theme
  'preferences.theme',
  'preferences',
  // Settings
  'settings',
  'settings.language',
  'settings.autoUpdate',
  'settings.adblockEnabled',
  'settings.uiFontScale',
  'settings.displayName',
  'settings.devMode',
  // Library bookmarks
  'library-bookmarks',
  // Update channel
  'preferences.updateChannel',
  // Custom backgrounds
  'custom-backgrounds',
  // Custom mascot sprite
  'custom-mascot-sprite',
  // Custom themes
  'custom-themes',
  // Browser settings (homepage, adblock)
  'browser-settings',
  // Notification settings
  'notification-settings',
  // Window state
  'window.bounds',
  'window.maximized',
  // Mascot overlay
  'settings.mascotEnabled',
  'settings.mascotSize',
  'settings.mascotVisibilityMode',
  'settings.mascotPositionLocked',
  'settings.mascotPosition',
  'settings.mascotAnimationEnabled',
  // Discord RPC settings
  'discord-rpc-settings',
  // Browser tab persistence (renderer saves/loads tabs directly)
  'browser-tabs',
  // Quick access sites and frequent visits
  'quick-access-sites',
  'quick-access-frequent',
  // Dock position and settings
  'dock-settings',
  // New Tab page panel visibility / order / preferences
  'newtab-settings',
  // Onboarding completion
  'onboarding-completed',
  // AniList profile username
  'anilist-username',
  // UI language (mirrored from renderer for main-process tray/notifications/Discord)
  UI_LANGUAGE_SETTING_KEY,
  // Feed bookmarks and read state (mirrored from renderer for cross-window access)
  'shiroani:feed-bookmarks',
  'shiroani:feedReadIds',
]);

/**
 * Check if a key is allowed for **reads** (exact match or prefix match for
 * nested keys). Reads may target a leaf under an allowed subtree — e.g.
 * reading `preferences.theme` when `preferences` is in the allowlist.
 */
function isReadKeyAllowed(key: string): boolean {
  // Check exact match
  if (ALLOWED_STORE_KEYS.has(key)) {
    return true;
  }

  // Check if key starts with an allowed prefix (for nested access)
  for (const allowedKey of ALLOWED_STORE_KEYS) {
    if (key.startsWith(`${allowedKey}.`)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a key is allowed for **writes** — exact match only.
 *
 * The prefix-match used for reads would let a renderer set arbitrary subtrees
 * under any allowed root (e.g. writing to `preferences.foo.bar` with no
 * schema). Writes must target a key that was explicitly enumerated, so that
 * each allowed write point is auditable and the payload shape is controlled
 * by the owning slice of code.
 */
function isWriteKeyAllowed(key: string): boolean {
  return ALLOWED_STORE_KEYS.has(key);
}

/**
 * Register electron-store IPC handlers
 */
export function registerStoreHandlers(): void {
  handleWithFallback(
    'store:get',
    (_event, key) => {
      if (!isReadKeyAllowed(key)) {
        logger.warn(`Blocked store:get for unauthorized key: ${key}`);
        return undefined;
      }
      return store.get(key);
    },
    () => undefined,
    { schema: storeGetSchema }
  );

  handle(
    'store:set',
    (_event, key, value) => {
      // Writes are exact-match only — see isWriteKeyAllowed for rationale.
      if (!isWriteKeyAllowed(key)) {
        logger.warn(`Blocked store:set for unauthorized key: ${key}`);
        return;
      }
      const serialized = JSON.stringify(value);
      if (serialized.length > 1_000_000) {
        throw new Error('Value too large');
      }
      store.set(key, value);

      // The tray context menu is built once and cached by Electron, so
      // changing the UI language at runtime does NOT relabel its entries
      // until we explicitly rebuild it. Other main-process surfaces
      // (notifications, Discord presence) read the language fresh on every
      // emit and need no extra hook.
      if (key === UI_LANGUAGE_SETTING_KEY) {
        try {
          rebuildTrayMenu();
        } catch (err) {
          logger.warn('Failed to rebuild tray menu after language change:', err);
        }
      }
    },
    { schema: storeSetSchema }
  );

  handle(
    'store:delete',
    (_event, key) => {
      // Deletes mirror writes: only enumerated keys may be deleted, preventing
      // a renderer from clearing arbitrary subtrees under an allowed root.
      if (!isWriteKeyAllowed(key)) {
        logger.warn(`Blocked store:delete for unauthorized key: ${key}`);
        return;
      }
      store.delete(key);
    },
    { schema: storeDeleteSchema }
  );
}

/**
 * Clean up electron-store IPC handlers
 */
export function cleanupStoreHandlers(): void {
  ipcMain.removeHandler('store:get');
  ipcMain.removeHandler('store:set');
  ipcMain.removeHandler('store:delete');
}
