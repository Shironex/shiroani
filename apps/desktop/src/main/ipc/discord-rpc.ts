import { ipcMain } from 'electron';
import type { DiscordRpcSettings } from '@shiroani/shared';
import {
  getDiscordRpcSettings,
  updateDiscordRpcSettings,
  updateDiscordPresence,
  clearDiscordPresence,
  getDiscordRpcStatus,
} from '../discord/discord-rpc-service';
import { handle, handleWithFallback } from './with-ipc-handler';
import {
  discordRpcGetSettingsSchema,
  discordRpcUpdateSettingsSchema,
  discordRpcUpdatePresenceSchema,
  discordRpcClearPresenceSchema,
  discordRpcGetStatusSchema,
} from './schemas';

/**
 * Register Discord RPC IPC handlers
 */
export function registerDiscordRpcHandlers(): void {
  handle(
    'discord-rpc:get-settings',
    () => {
      return getDiscordRpcSettings();
    },
    { schema: discordRpcGetSettingsSchema }
  );

  handle(
    'discord-rpc:get-status',
    () => {
      return getDiscordRpcStatus();
    },
    { schema: discordRpcGetStatusSchema }
  );

  handle(
    'discord-rpc:update-settings',
    (_event, updates) => {
      // Zod infers `templates` as a Partial<Record<...>> while the canonical
      // `DiscordRpcSettings.templates` is Record<...>. Cast at the boundary —
      // the schema already enforces shape.
      return updateDiscordRpcSettings(updates as Partial<DiscordRpcSettings>);
    },
    { schema: discordRpcUpdateSettingsSchema }
  );

  handleWithFallback(
    'discord-rpc:update-presence',
    (_event, activity) => {
      updateDiscordPresence(activity);
    },
    () => undefined,
    { schema: discordRpcUpdatePresenceSchema }
  );

  handleWithFallback(
    'discord-rpc:clear-presence',
    () => {
      clearDiscordPresence();
    },
    () => undefined,
    { schema: discordRpcClearPresenceSchema }
  );
}

/**
 * Clean up Discord RPC IPC handlers
 */
export function cleanupDiscordRpcHandlers(): void {
  ipcMain.removeHandler('discord-rpc:get-settings');
  ipcMain.removeHandler('discord-rpc:get-status');
  ipcMain.removeHandler('discord-rpc:update-settings');
  ipcMain.removeHandler('discord-rpc:update-presence');
  ipcMain.removeHandler('discord-rpc:clear-presence');
}
