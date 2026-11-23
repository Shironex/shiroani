import type { BrowserWindow } from 'electron';
import { InflightTracker } from '../../../modules/kernel/inflight-tracker';
import { createSystemHandlers } from '../../../modules/kernel/backend-handlers';
import {
  createIpcEventPublisher,
  isRendererUrl,
  isTrustedSender,
  registerBackendIpc,
} from '../backend';

jest.mock('electron');

const getMock = () =>
  require('electron') as typeof import('electron') & {
    ipcMain: {
      __reset: () => void;
      __invokeWithEvent: (channel: string, event: unknown, ...args: unknown[]) => Promise<unknown>;
      __handlers: Map<string, unknown>;
    };
  };

const RENDERER_URL =
  'file:///Applications/ShiroAni.app/Contents/Resources/app.asar/dist/renderer/index.html';

function makeWindow(url = RENDERER_URL) {
  const mainFrame = { url };
  const webContents = { mainFrame, isDestroyed: () => false, send: jest.fn() };
  const win = { isDestroyed: () => false, webContents } as unknown as BrowserWindow;
  return { win, webContents, mainFrame };
}

function mainEvent(win: ReturnType<typeof makeWindow>) {
  return { sender: win.webContents, senderFrame: win.mainFrame } as never;
}

describe('isRendererUrl', () => {
  it('accepts the packaged file path, ignoring hash and query', () => {
    expect(isRendererUrl(RENDERER_URL, RENDERER_URL)).toBe(true);
    expect(isRendererUrl(`${RENDERER_URL}#/library`, RENDERER_URL)).toBe(true);
    expect(isRendererUrl(`${RENDERER_URL}?x=1`, RENDERER_URL)).toBe(true);
  });

  it('accepts a path with encoded characters however it was encoded', () => {
    const expected = 'file:///Users/a%20b/renderer/index.html';
    expect(isRendererUrl('file:///Users/a b/renderer/index.html', expected)).toBe(true);
  });

  it('rejects another file, and another protocol with the same path', () => {
    expect(isRendererUrl('file:///tmp/evil.html', RENDERER_URL)).toBe(false);
    expect(isRendererUrl(RENDERER_URL.replace('file:', 'https:'), RENDERER_URL)).toBe(false);
  });

  it('compares Windows paths case-insensitively, and POSIX paths exactly', () => {
    const expected = 'file:///C:/Program%20Files/ShiroAni/index.html';
    const actual = 'file:///c:/program%20files/shiroani/index.html';
    expect(isRendererUrl(actual, expected, 'win32')).toBe(true);
    expect(isRendererUrl(actual, expected, 'darwin')).toBe(false);
  });

  it('matches the dev server by origin', () => {
    const dev = 'http://localhost:15174';
    expect(isRendererUrl('http://localhost:15174/', dev)).toBe(true);
    expect(isRendererUrl('http://localhost:15174/some/route', dev)).toBe(true);
    expect(isRendererUrl('http://localhost:9999/', dev)).toBe(false);
    expect(isRendererUrl('https://evil.example/', dev)).toBe(false);
  });

  it('rejects unparseable and empty URLs', () => {
    expect(isRendererUrl('', RENDERER_URL)).toBe(false);
    expect(isRendererUrl('not a url', RENDERER_URL)).toBe(false);
  });
});

describe('isTrustedSender', () => {
  it('accepts the main frame of the main window', () => {
    const win = makeWindow();
    expect(isTrustedSender(mainEvent(win), win.win, RENDERER_URL)).toBe(true);
  });

  it('rejects a foreign webContents', () => {
    const win = makeWindow();
    const event = { sender: {}, senderFrame: win.mainFrame } as never;
    expect(isTrustedSender(event, win.win, RENDERER_URL)).toBe(false);
  });

  it('rejects a subframe of the main window', () => {
    const win = makeWindow();
    const event = { sender: win.webContents, senderFrame: { url: RENDERER_URL } } as never;
    expect(isTrustedSender(event, win.win, RENDERER_URL)).toBe(false);
  });

  it('rejects a null frame, and one that throws on access', () => {
    const win = makeWindow();
    expect(
      isTrustedSender(
        { sender: win.webContents, senderFrame: null } as never,
        win.win,
        RENDERER_URL
      )
    ).toBe(false);
    const disposed = {
      sender: win.webContents,
      get senderFrame() {
        throw new Error('frame disposed');
      },
    } as never;
    expect(isTrustedSender(disposed, win.win, RENDERER_URL)).toBe(false);
  });

  it('rejects the main frame once it has navigated off the app', () => {
    const win = makeWindow('https://evil.example/');
    expect(isTrustedSender(mainEvent(win), win.win, RENDERER_URL)).toBe(false);
  });

  it('rejects when there is no live window', () => {
    const win = makeWindow();
    expect(isTrustedSender(mainEvent(win), null, RENDERER_URL)).toBe(false);
    const destroyed = { ...win.win, isDestroyed: () => true } as unknown as BrowserWindow;
    expect(isTrustedSender(mainEvent(win), destroyed, RENDERER_URL)).toBe(false);
  });
});

describe('registerBackendIpc', () => {
  function setup(win: BrowserWindow | null) {
    const { ipcMain } = getMock();
    ipcMain.__reset();
    const disposers: Array<() => void> = [];
    const inflight = new InflightTracker();
    registerBackendIpc(
      {
        handlers: createSystemHandlers(),
        inflight,
        addDisposer: (_name, dispose) => disposers.push(dispose),
      },
      { getMainWindow: () => win, rendererUrl: RENDERER_URL }
    );
    return { ipcMain, disposers, inflight };
  }

  it('answers a trusted sender', async () => {
    const win = makeWindow();
    const { ipcMain } = setup(win.win);
    await expect(ipcMain.__invokeWithEvent('backend:ping', mainEvent(win))).resolves.toEqual({
      ok: true,
    });
  });

  it('denies a foreign sender before reaching the handler', async () => {
    const win = makeWindow();
    const { ipcMain } = setup(win.win);
    await expect(
      ipcMain.__invokeWithEvent('backend:ping', { sender: {}, senderFrame: null })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('resolves the window per call, so a recreated window keeps working', async () => {
    const first = makeWindow();
    const second = makeWindow();
    let current: BrowserWindow = first.win;
    const { ipcMain } = getMock();
    ipcMain.__reset();
    registerBackendIpc(
      {
        handlers: createSystemHandlers(),
        inflight: new InflightTracker(),
        addDisposer: () => {},
      },
      { getMainWindow: () => current, rendererUrl: RENDERER_URL }
    );

    current = second.win;

    await expect(ipcMain.__invokeWithEvent('backend:ping', mainEvent(second))).resolves.toEqual({
      ok: true,
    });
    await expect(ipcMain.__invokeWithEvent('backend:ping', mainEvent(first))).rejects.toMatchObject(
      {
        code: 'FORBIDDEN',
      }
    );
  });

  it('removes its handlers through the disposer', () => {
    const { ipcMain, disposers } = setup(makeWindow().win);
    expect(ipcMain.__handlers.has('backend:ping')).toBe(true);
    disposers.forEach(dispose => dispose());
    expect(ipcMain.__handlers.has('backend:ping')).toBe(false);
  });
});

describe('createIpcEventPublisher', () => {
  const emit = (win: BrowserWindow | null) =>
    createIpcEventPublisher(() => win).emit('test:event' as never, { a: 1 } as never);

  it('sends to the main window', () => {
    const win = makeWindow();
    emit(win.win);
    expect(win.webContents.send).toHaveBeenCalledWith('test:event', { a: 1 });
  });

  it('drops the event with no window or a destroyed one', () => {
    expect(() => emit(null)).not.toThrow();
    const win = makeWindow();
    emit({ ...win.win, isDestroyed: () => true } as unknown as BrowserWindow);
    expect(win.webContents.send).not.toHaveBeenCalled();
  });

  it('does not let a failed send reach the caller', () => {
    const win = makeWindow();
    win.webContents.send.mockImplementation(() => {
      throw new Error('could not clone');
    });
    expect(() => emit(win.win)).not.toThrow();
  });
});

describe('InflightTracker', () => {
  it('waits for tracked calls, including rejected ones', async () => {
    const tracker = new InflightTracker();
    let release!: () => void;
    let drained = false;
    void tracker.track(new Promise<void>(resolve => (release = resolve)));
    void tracker.track(Promise.reject(new Error('boom'))).catch(() => {});

    const drain = tracker.drain(1_000).then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);

    release();
    await drain;
    expect(drained).toBe(true);
    await Promise.resolve();
    expect(tracker.size).toBe(0);
  });

  it('stops waiting at the timeout', async () => {
    jest.useFakeTimers();
    const tracker = new InflightTracker();
    void tracker.track(new Promise(() => {}));

    const drain = tracker.drain(2_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await drain;

    expect(tracker.size).toBe(1);
    jest.useRealTimers();
  });
});
