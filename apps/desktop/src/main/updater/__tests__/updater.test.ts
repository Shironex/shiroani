jest.mock('electron');
jest.mock('electron-updater');
const mockStore = {
  get: jest.fn(() => 'stable'),
  set: jest.fn(),
};
jest.mock('../../store', () => ({ store: mockStore }));
jest.mock('../../logging/logger', () => ({
  createMainLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
  attachUpdaterLogger: jest.fn(),
}));

/**
 * Lazy re-requires for electron and electron-updater — jest.resetModules()
 * between tests creates fresh instances, so we grab the current instance AFTER
 * reset. The updater module under test and these helpers then share that
 * instance.
 */

const getElectron = () => require('electron') as typeof import('electron');

const getUpdaterMock = () => require('electron-updater') as typeof import('electron-updater');

const originalPlatform = process.platform;
function setPlatform(p: NodeJS.Platform) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

describe('updater module', () => {
  beforeEach(() => {
    jest.resetModules();
    // Use fake timers for the entire suite so setInterval/setTimeout schedules
    // from initializeAutoUpdater don't keep the worker alive past test exit.
    jest.useFakeTimers();
    mockStore.get.mockReset();
    mockStore.set.mockReset();
    mockStore.get.mockReturnValue('stable');
    const { autoUpdater } = getUpdaterMock();
    (autoUpdater.checkForUpdates as jest.Mock).mockReset();
    (autoUpdater.checkForUpdates as jest.Mock).mockResolvedValue(null);
    (autoUpdater.downloadUpdate as jest.Mock).mockReset();
    (autoUpdater.downloadUpdate as jest.Mock).mockResolvedValue(null);
    (autoUpdater.quitAndInstall as jest.Mock).mockReset();
    (autoUpdater as unknown as { removeAllListeners: () => void }).removeAllListeners();
    (autoUpdater as unknown as { channel: string | null }).channel = null;
    (autoUpdater as unknown as { allowPrerelease: boolean }).allowPrerelease = false;
    const { app } = getElectron();
    (app.getVersion as jest.Mock).mockReturnValue('1.0.0');
  });

  afterEach(() => {
    setPlatform(originalPlatform);
    // Clear any scheduled timers (periodic update check) before restoring real timers.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('checkForUpdates returns { enabled: false } before init', async () => {
    const { checkForUpdates } = await import('..');
    const result = await checkForUpdates();
    expect(result.enabled).toBe(false);
  });

  it('initializeAutoUpdater does NOT enable in dev mode', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, true);
    const result = await updater.checkForUpdates();
    expect(result.enabled).toBe(false);
  });

  it('initializeAutoUpdater disables on macOS', async () => {
    setPlatform('darwin');
    const updater = await import('..');
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);
    const result = await updater.checkForUpdates();
    expect(result.enabled).toBe(false);
  });

  it('initializeAutoUpdater enables updater on linux in non-dev', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);
    const result = await updater.checkForUpdates();
    expect(result.enabled).toBe(true);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it('applies beta channel when persisted', async () => {
    setPlatform('linux');
    mockStore.get.mockReturnValue('beta');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);
    expect(autoUpdater.channel).toBe('beta');
    expect(autoUpdater.allowPrerelease).toBe(true);
  });

  it('forwards update-available event to renderer', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (autoUpdater as any).emit('update-available', {
      version: '2.0.0',
      releaseNotes: 'Big release',
      releaseDate: '2026-01-01',
    });

    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:update-available',
      expect.objectContaining({ version: '2.0.0', releaseNotes: 'Big release' })
    );
  });

  it('forwards download-progress event to renderer', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (autoUpdater as any).emit('download-progress', {
      bytesPerSecond: 1000,
      percent: 42.5,
      transferred: 100,
      total: 200,
    });

    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:download-progress',
      expect.objectContaining({ percent: 42.5, bytesPerSecond: 1000 })
    );
  });

  it('forwards update-downloaded event to renderer', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (autoUpdater as any).emit('update-downloaded', {
      version: '2.0.0',
      releaseNotes: null,
      releaseDate: '2026-01-01',
    });

    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:update-downloaded',
      expect.objectContaining({ version: '2.0.0' })
    );
  });

  it('maps .yml 404 error to awaiting-artifacts broadcast (not the error channel)', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    updater.initializeAutoUpdater(win, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (autoUpdater as any).emit('error', new Error('Cannot find latest.yml in the latest release'));

    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:awaiting-artifacts',
      expect.objectContaining({ since: expect.any(Number) })
    );
    expect(win.webContents.send).not.toHaveBeenCalledWith('updater:error', 'RELEASE_PENDING');
  });

  it('maps binary-asset 404 (.exe) error to awaiting-artifacts broadcast', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    updater.initializeAutoUpdater(win, false);

    (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit(
      'error',
      new Error(
        'Cannot download "https://github.com/Shironex/shiroani/releases/download/v2.0.0/ShiroAni-Setup-2.0.0.exe": HTTP 404'
      )
    );

    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:awaiting-artifacts',
      expect.objectContaining({ since: expect.any(Number) })
    );
  });

  it('schedules retry with exponential backoff after awaiting-artifacts', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    updater.initializeAutoUpdater(win, false);

    // Drain the initial 5s startup check so its mock call doesn't pollute counts.
    await jest.advanceTimersByTimeAsync(5000);
    (autoUpdater.checkForUpdates as jest.Mock).mockClear();

    (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit(
      'error',
      new Error('Cannot find latest.yml in the latest release')
    );

    // First retry @ 30s.
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    // Second 404 → next backoff is 60s.
    (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit(
      'error',
      new Error('Cannot find latest.yml in the latest release')
    );
    await jest.advanceTimersByTimeAsync(60_000);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('clears retry timer when update-available fires', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    updater.initializeAutoUpdater(win, false);

    await jest.advanceTimersByTimeAsync(5000);
    (autoUpdater.checkForUpdates as jest.Mock).mockClear();

    (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit(
      'error',
      new Error('Cannot find latest.yml')
    );

    // Recovery: artifacts landed.
    (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit('update-available', {
      version: '2.0.0',
      releaseNotes: null,
      releaseDate: '2026-01-01',
    });

    // Walk past the would-be retry deadline; the timer should have been cleared.
    await jest.advanceTimersByTimeAsync(60_000);
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('falls back to update-not-available after the 30-min retry budget runs out', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([win]);
    updater.initializeAutoUpdater(win, false);

    await jest.advanceTimersByTimeAsync(5000);
    (autoUpdater.checkForUpdates as jest.Mock).mockClear();
    (win.webContents.send as jest.Mock).mockClear();

    // Kick off awaiting-artifacts and keep failing every retry until the
    // 30-min budget is exhausted. Backoff schedule is 30s, 60s, 120s, 300s,
    // 600s, 600s, 600s ... — total > 30min after the 6th attempt.
    const fail = () =>
      (autoUpdater as unknown as { emit: (e: string, p: unknown) => void }).emit(
        'error',
        new Error('Cannot find latest.yml')
      );
    fail();
    const delays = [30_000, 60_000, 120_000, 300_000, 600_000, 600_000, 600_000];
    for (const d of delays) {
      await jest.advanceTimersByTimeAsync(d);
      fail();
    }

    // Once the budget is exhausted, the main process should emit a fallback
    // `update-not-available` so the renderer drops back to idle.
    expect(win.webContents.send).toHaveBeenCalledWith(
      'updater:update-not-available',
      expect.objectContaining({ version: expect.any(String) })
    );
  });

  it('forwards generic error message to renderer', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (autoUpdater as any).emit('error', new Error('Something else went wrong'));

    expect(win.webContents.send).toHaveBeenCalledWith('updater:error', 'Something else went wrong');
  });

  it('setUpdateChannel persists and applies beta', async () => {
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const result = await updater.setUpdateChannel('beta');
    expect(mockStore.set).toHaveBeenCalledWith('preferences.updateChannel', 'beta');
    expect(autoUpdater.channel).toBe('beta');
    expect(autoUpdater.allowPrerelease).toBe(true);
    expect(result).toBe('beta');
  });

  it('setUpdateChannel persists and applies stable', async () => {
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    await updater.setUpdateChannel('stable');
    expect(mockStore.set).toHaveBeenCalledWith('preferences.updateChannel', 'stable');
    expect(autoUpdater.channel).toBe('latest');
    expect(autoUpdater.allowPrerelease).toBe(false);
  });

  it('downloadUpdate delegates to autoUpdater', async () => {
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    await updater.downloadUpdate();
    expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
  });

  it('quitAndInstall delegates to autoUpdater', async () => {
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    updater.quitAndInstall();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
  });

  it('initial check runs after 5s, periodic every hour', async () => {
    setPlatform('linux');
    const updater = await import('..');
    const { autoUpdater } = getUpdaterMock();
    const { BrowserWindow } = getElectron();
    const win = new BrowserWindow();
    updater.initializeAutoUpdater(win, false);

    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(5000);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(2);
  });
});
