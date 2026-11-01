jest.mock('electron');

const getElectronMock = () =>
  require('electron') as typeof import('electron') & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contextBridge: any;
  };

describe('preload channel allow-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let electronAPI: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ipcRenderer: any;

  beforeEach(() => {
    jest.resetModules();
    const mod = getElectronMock();
    mod.contextBridge.__reset();
    ipcRenderer = mod.ipcRenderer;
    ipcRenderer.invoke.mockReset();
    ipcRenderer.send.mockReset();

    require('../preload');
    electronAPI = mod.contextBridge.__getExposed('electronAPI');
  });

  it('exposes the electronAPI to the main world', () => {
    const mod = getElectronMock();
    expect(mod.contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'electronAPI',
      expect.any(Object)
    );
    expect(electronAPI).toBeDefined();
  });

  describe('backend bridge', () => {
    it('forwards allow-listed requests with their payload', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce({ ok: true });
      await expect(electronAPI.backend.invoke('backend:ping')).resolves.toEqual({ ok: true });
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('backend:ping');
    });

    it('rejects a request channel that is not allow-listed without calling main', async () => {
      await expect(electronAPI.backend.invoke('store:clear')).rejects.toThrow(/not allowed/i);
      expect(ipcRenderer.invoke).not.toHaveBeenCalled();
    });

    it('refuses to subscribe to an event that is not allow-listed', () => {
      expect(() => electronAPI.backend.on('library:updated', () => {})).toThrow(/not allowed/i);
      expect(ipcRenderer.on).not.toHaveBeenCalled();
    });
  });

  describe('ipc.invokeWithTimeout', () => {
    it('throws on unlisted channels (assertAllowedChannel runs synchronously)', () => {
      expect(() => electronAPI.ipc.invokeWithTimeout('unlisted:channel', 5000)).toThrow(
        /not allowed/i
      );
    });

    it('delegates allowed channels to ipcRenderer.invoke', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce(true);
      const result = await electronAPI.ipc.invokeWithTimeout('window:is-maximized', 5000);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('window:is-maximized');
      expect(result).toBe(true);
    });

    it('passes additional args through to invoke', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce(undefined);
      await electronAPI.ipc.invokeWithTimeout('store:get', 5000, 'preferences');
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('store:get', 'preferences');
    });

    it('rejects with a timeout error when the invoke is too slow', async () => {
      jest.useFakeTimers();
      // Never-resolving promise
      ipcRenderer.invoke.mockReturnValueOnce(new Promise(() => {}));
      const promise = electronAPI.ipc.invokeWithTimeout('window:is-maximized', 100);
      jest.advanceTimersByTime(101);
      await expect(promise).rejects.toThrow(/IPC timeout/i);
      jest.useRealTimers();
    });
  });

  describe('ipc.cancellableInvoke', () => {
    it('rejects unlisted channels before invoking', () => {
      expect(() => electronAPI.ipc.cancellableInvoke('unlisted:cancel')).toThrow(/not allowed/i);
    });

    it('cancel() rejects the promise without invoking fulfillment', async () => {
      let resolveInvoke: (v: unknown) => void = () => {};
      ipcRenderer.invoke.mockReturnValueOnce(
        new Promise(r => {
          resolveInvoke = r;
        })
      );
      const handle = electronAPI.ipc.cancellableInvoke('window:is-maximized');
      handle.cancel();
      await expect(handle.promise).rejects.toThrow(/cancelled/i);
      // Late resolution should not throw anything visible
      resolveInvoke('late');
    });

    it('resolves with the main-process result when not cancelled', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce('hello');
      const handle = electronAPI.ipc.cancellableInvoke('window:is-maximized');
      await expect(handle.promise).resolves.toBe('hello');
    });
  });

  describe('window API sends over ipcRenderer', () => {
    it('window.minimize sends the minimize message', () => {
      electronAPI.window.minimize();
      expect(ipcRenderer.send).toHaveBeenCalledWith('window:minimize');
    });

    it('window.maximize sends the maximize message', () => {
      electronAPI.window.maximize();
      expect(ipcRenderer.send).toHaveBeenCalledWith('window:maximize');
    });

    it('window.close sends the close message', () => {
      electronAPI.window.close();
      expect(ipcRenderer.send).toHaveBeenCalledWith('window:close');
    });
  });

  describe('store API', () => {
    it('store.get invokes with key', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce('value');
      await electronAPI.store.get('preferences');
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('store:get', 'preferences');
    });

    it('store.set invokes with key and value', async () => {
      ipcRenderer.invoke.mockResolvedValueOnce(undefined);
      await electronAPI.store.set('settings', { x: 1 });
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('store:set', 'settings', { x: 1 });
    });
  });

  describe('platform', () => {
    it('exposes process.platform', () => {
      expect(electronAPI.platform).toBe(process.platform);
    });
  });
});
