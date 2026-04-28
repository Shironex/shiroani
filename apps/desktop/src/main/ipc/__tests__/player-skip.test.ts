jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockController = {
  attach: jest.fn(),
  detach: jest.fn(),
  update: jest.fn(),
  setAniSkipClient: jest.fn(),
  detachAll: jest.fn(),
};

jest.mock('../../browser/player-skip-controller', () => ({
  playerSkipController: mockController,
}));

jest.mock('../../browser/player-skip', () => ({
  findPlayingVideoFrame: jest.fn(),
  injectSkipButtonIntoFrame: jest.fn(),
  probeFrames: jest.fn(),
  seekActiveVideo: jest.fn(),
}));

import { ipcMain } from 'electron';
import { registerPlayerSkipHandlers, cleanupPlayerSkipHandlers } from '../player-skip';

describe('registerPlayerSkipHandlers — controller channels', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    Object.values(mockController).forEach(fn => (fn as jest.Mock).mockReset());
  });

  describe('player-skip:attach-controller', () => {
    it('forwards payload to controller and returns mode', async () => {
      mockController.attach.mockResolvedValue('fallback');
      registerPlayerSkipHandlers();

      const result = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('player-skip:attach-controller', {
        webContentsId: 5,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });

      expect(mockController.attach).toHaveBeenCalledWith({
        webContentsId: 5,
        malId: 9253,
        episode: 1,
        autoSkipEnabled: false,
      });
      expect(result).toEqual({ ok: true, mode: 'fallback' });
    });

    it('accepts null malId and episode', async () => {
      mockController.attach.mockResolvedValue('none');
      registerPlayerSkipHandlers();

      const result = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('player-skip:attach-controller', {
        webContentsId: 5,
        malId: null,
        episode: null,
        autoSkipEnabled: true,
      });

      expect(result.ok).toBe(true);
      expect(result.mode).toBe('none');
    });

    it('rejects negative webContentsId', async () => {
      registerPlayerSkipHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('player-skip:attach-controller', {
          webContentsId: -1,
          malId: null,
          episode: null,
          autoSkipEnabled: false,
        })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('rejects missing autoSkipEnabled', async () => {
      registerPlayerSkipHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('player-skip:attach-controller', {
          webContentsId: 1,
          malId: null,
          episode: null,
        })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('player-skip:detach-controller', () => {
    it('forwards webContentsId to controller', async () => {
      registerPlayerSkipHandlers();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('player-skip:detach-controller', {
        webContentsId: 5,
      });
      expect(mockController.detach).toHaveBeenCalledWith(5);
      expect(result).toEqual({ ok: true });
    });

    it('rejects payload missing webContentsId', async () => {
      registerPlayerSkipHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('player-skip:detach-controller', {})
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('player-skip:update-controller', () => {
    it('forwards partial state to controller', async () => {
      mockController.update.mockResolvedValue('aniskip');
      registerPlayerSkipHandlers();

      const result = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('player-skip:update-controller', {
        webContentsId: 5,
        partial: { episode: 2 },
      });

      expect(mockController.update).toHaveBeenCalledWith(5, { episode: 2 });
      expect(result).toEqual({ ok: true, mode: 'aniskip' });
    });

    it('accepts an empty partial', async () => {
      mockController.update.mockResolvedValue('fallback');
      registerPlayerSkipHandlers();

      const result = await // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ipcMain as any).__invoke('player-skip:update-controller', {
        webContentsId: 5,
        partial: {},
      });
      expect(result.ok).toBe(true);
    });

    it('rejects unknown keys in partial (strict)', async () => {
      registerPlayerSkipHandlers();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('player-skip:update-controller', {
          webContentsId: 5,
          partial: { rogueField: true },
        })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('cleanupPlayerSkipHandlers', () => {
    it('removes all controller channels', () => {
      registerPlayerSkipHandlers();
      cleanupPlayerSkipHandlers();
      [
        'player-skip:attach-controller',
        'player-skip:detach-controller',
        'player-skip:update-controller',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
});
