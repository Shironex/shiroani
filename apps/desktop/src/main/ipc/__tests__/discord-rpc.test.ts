jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockService = {
  getDiscordRpcSettings: jest.fn(),
  updateDiscordRpcSettings: jest.fn(),
  updateDiscordPresence: jest.fn(),
  clearDiscordPresence: jest.fn(),
};
jest.mock('../../discord/discord-rpc-service', () => mockService);

import { ipcMain } from 'electron';
import { registerDiscordRpcHandlers, cleanupDiscordRpcHandlers } from '../discord-rpc';

describe('registerDiscordRpcHandlers', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockService).forEach(fn => (fn as jest.Mock).mockReset());
  });

  it('discord-rpc:get-settings delegates to service', async () => {
    mockService.getDiscordRpcSettings.mockReturnValue({ enabled: true });
    registerDiscordRpcHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('discord-rpc:get-settings');
    expect(mockService.getDiscordRpcSettings).toHaveBeenCalled();
    expect(result).toEqual({ enabled: true });
  });

  it('discord-rpc:update-settings delegates with payload', async () => {
    const updates = { enabled: false };
    mockService.updateDiscordRpcSettings.mockReturnValue(updates);
    registerDiscordRpcHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ipcMain as any).__invoke('discord-rpc:update-settings', updates);
    expect(mockService.updateDiscordRpcSettings).toHaveBeenCalledWith(updates);
    expect(result).toEqual(updates);
  });

  it('discord-rpc:update-presence delegates with activity', async () => {
    registerDiscordRpcHandlers();
    const activity = { view: 'library' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('discord-rpc:update-presence', activity);
    expect(mockService.updateDiscordPresence).toHaveBeenCalledWith(activity);
  });

  it('discord-rpc:update-presence swallows service errors (fallback)', async () => {
    mockService.updateDiscordPresence.mockImplementation(() => {
      throw new Error('rpc down');
    });
    registerDiscordRpcHandlers();
    const activity = { view: 'library' };
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('discord-rpc:update-presence', activity)
    ).resolves.toBeUndefined();
  });

  it('discord-rpc:clear-presence delegates', async () => {
    registerDiscordRpcHandlers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ipcMain as any).__invoke('discord-rpc:clear-presence');
    expect(mockService.clearDiscordPresence).toHaveBeenCalled();
  });

  describe('cleanupDiscordRpcHandlers', () => {
    it('removes all discord-rpc handlers', () => {
      registerDiscordRpcHandlers();
      cleanupDiscordRpcHandlers();
      [
        'discord-rpc:get-settings',
        'discord-rpc:get-status',
        'discord-rpc:update-settings',
        'discord-rpc:update-presence',
        'discord-rpc:clear-presence',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
