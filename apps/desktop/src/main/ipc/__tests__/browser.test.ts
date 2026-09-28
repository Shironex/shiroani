jest.mock('electron');
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('../../browser/webview-context-menu', () => ({
  attachWebviewContextMenu: jest.fn(),
}));

import { EventEmitter } from 'events';
import { ipcMain, BrowserWindow } from 'electron';
import {
  registerBrowserHandlers,
  cleanupBrowserHandlers,
  getPopupBlockEnabled,
  setPopupBlockEnabled,
} from '../browser';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeBrowserManagerStub = (overrides: Partial<any> = {}) => ({
  enableAdblock: jest.fn().mockResolvedValue(undefined),
  disableAdblock: jest.fn().mockResolvedValue(undefined),
  setAdblockWhitelist: jest.fn(),
  isAdblockEnabled: jest.fn(() => false),
  ...overrides,
});

describe('registerBrowserHandlers', () => {
  let win: InstanceType<typeof BrowserWindow>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browserManager: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ipcMain as any).__reset();
    win = new BrowserWindow();
    browserManager = makeBrowserManagerStub();
    // Reset popup block to default (true) between tests
    setPopupBlockEnabled(true);
  });

  describe('browser:toggle-adblock', () => {
    it('enables adblock when arg is true', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:toggle-adblock', true);
      expect(browserManager.enableAdblock).toHaveBeenCalled();
      expect(browserManager.disableAdblock).not.toHaveBeenCalled();
    });

    it('disables adblock when arg is false', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:toggle-adblock', false);
      expect(browserManager.disableAdblock).toHaveBeenCalled();
      expect(browserManager.enableAdblock).not.toHaveBeenCalled();
    });

    it('BAD_REQUEST on non-boolean', async () => {
      registerBrowserHandlers(win, browserManager);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ipcMain as any).__invoke('browser:toggle-adblock', 'yes')
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('browser:set-fullscreen', () => {
    it('calls win.setFullScreen', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-fullscreen', true);
      expect(win.setFullScreen).toHaveBeenCalledWith(true);
    });

    it('no-ops on destroyed window', async () => {
      win.isDestroyed = jest.fn(() => true);
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-fullscreen', true);
      expect(win.setFullScreen).not.toHaveBeenCalled();
    });
  });

  describe('browser:get-popup-block-enabled', () => {
    it('returns current popup block state', async () => {
      setPopupBlockEnabled(false);
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (ipcMain as any).__invoke('browser:get-popup-block-enabled');
      expect(result).toBe(false);
    });
  });

  describe('browser:set-popup-block-enabled', () => {
    it('updates the popup block state', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-popup-block-enabled', false);
      expect(getPopupBlockEnabled()).toBe(false);
    });
  });

  describe('browser:set-adblock-whitelist', () => {
    it('forwards cleaned host list to browser manager', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', [
        'example.com',
        '  trimmed.io  ',
      ]);
      expect(browserManager.setAdblockWhitelist).toHaveBeenCalledWith([
        'example.com',
        'trimmed.io',
      ]);
    });

    it('ignores non-array payloads', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', 'not-an-array');
      expect(browserManager.setAdblockWhitelist).not.toHaveBeenCalled();
    });

    it('filters out non-string entries', async () => {
      registerBrowserHandlers(win, browserManager);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ipcMain as any).__invoke('browser:set-adblock-whitelist', [
        'ok.com',
        123,
        null,
        'also-ok.com',
      ]);
      expect(browserManager.setAdblockWhitelist).toHaveBeenCalledWith(['ok.com', 'also-ok.com']);
    });
  });

  describe('cleanupBrowserHandlers', () => {
    it('removes all browser handlers', () => {
      registerBrowserHandlers(win, browserManager);
      cleanupBrowserHandlers();
      [
        'browser:toggle-adblock',
        'browser:set-fullscreen',
        'browser:get-popup-block-enabled',
        'browser:set-popup-block-enabled',
        'browser:set-adblock-whitelist',
      ].forEach(ch => {
        expect(ipcMain.removeHandler).toHaveBeenCalledWith(ch);
      });
    });
  });
  describe('guest keyboard and zoom forwarding', () => {
    /** Register handlers, then attach a fake guest and return it plus the main window's send mock. */
    function attachGuest() {
      registerBrowserHandlers(win, browserManager);
      const onMock = win.webContents.on as jest.Mock;
      const attach = onMock.mock.calls.find(([event]) => event === 'did-attach-webview')?.[1];
      const guest = Object.assign(new EventEmitter(), {
        setWindowOpenHandler: jest.fn(),
        executeJavaScript: jest.fn().mockResolvedValue(undefined),
        getURL: jest.fn(() => 'https://example.com/'),
      });
      attach({}, guest);
      return { guest, send: win.webContents.send as jest.Mock };
    }

    function pressKey(guest: EventEmitter, input: Record<string, unknown>) {
      const event = { preventDefault: jest.fn() };
      guest.emit('before-input-event', event, {
        type: 'keyDown',
        control: false,
        meta: false,
        alt: false,
        shift: false,
        ...input,
      });
      return event;
    }

    it.each(['=', '+', '-', '0'])('forwards Ctrl+%s as a browser shortcut', key => {
      const { guest, send } = attachGuest();
      const event = pressKey(guest, { key, control: true });
      expect(event.preventDefault).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith('browser:shortcut', { key, ctrl: true, shift: false });
    });

    it('forwards Cmd+= (meta) the same way', () => {
      const { guest, send } = attachGuest();
      pressKey(guest, { key: '=', meta: true });
      expect(send).toHaveBeenCalledWith('browser:shortcut', { key: '=', ctrl: true, shift: false });
    });

    it('leaves zoom keys without Ctrl, and AltGr (Ctrl+Alt) combos, to the page', () => {
      const { guest, send } = attachGuest();
      const plain = pressKey(guest, { key: '-' });
      const altGr = pressKey(guest, { key: '0', control: true, alt: true });
      expect(plain.preventDefault).not.toHaveBeenCalled();
      expect(altGr.preventDefault).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('turns Ctrl+wheel zoom requests into zoom shortcuts', () => {
      const { guest, send } = attachGuest();
      guest.emit('zoom-changed', {}, 'in');
      guest.emit('zoom-changed', {}, 'out');
      expect(send).toHaveBeenNthCalledWith(1, 'browser:shortcut', { key: '=', ctrl: true });
      expect(send).toHaveBeenNthCalledWith(2, 'browser:shortcut', { key: '-', ctrl: true });
    });
  });
});
