import { ipcRenderer } from 'electron';
import type {
  ElectronAPI,
  DiscordRpcSettings,
  DiscordPresenceActivity,
  DiscordRpcStatus,
} from '@shiroani/shared';
import { createIpcListener } from './_shared';

export const discordRpcApi: ElectronAPI['discordRpc'] = {
  getSettings: () => ipcRenderer.invoke('discord-rpc:get-settings') as Promise<DiscordRpcSettings>,
  updateSettings: (updates: Partial<DiscordRpcSettings>) =>
    ipcRenderer.invoke('discord-rpc:update-settings', updates) as Promise<DiscordRpcSettings>,
  updatePresence: (activity: DiscordPresenceActivity) =>
    ipcRenderer.invoke('discord-rpc:update-presence', activity) as Promise<void>,
  clearPresence: () => ipcRenderer.invoke('discord-rpc:clear-presence') as Promise<void>,
  getStatus: () => ipcRenderer.invoke('discord-rpc:get-status') as Promise<DiscordRpcStatus>,
  onStatusChanged: createIpcListener<DiscordRpcStatus>('discord-rpc:status-changed'),
};
