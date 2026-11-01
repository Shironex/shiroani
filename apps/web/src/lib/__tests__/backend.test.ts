import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  emitWithErrorHandling: vi.fn(),
  socket: { on: vi.fn(), off: vi.fn() },
}));

vi.mock('../socket', () => ({ getSocket: () => mocks.socket }));
vi.mock('../socketHelpers', () => ({
  DEFAULT_TIMEOUT: 10_000,
  emitWithErrorHandling: mocks.emitWithErrorHandling,
}));
vi.mock('@shiroani/shared', async importOriginal => ({
  ...(await importOriginal<typeof import('@shiroani/shared')>()),
  BACKEND_REQUEST_CHANNELS: ['test:ipc'],
  BACKEND_EVENT_CHANNELS: ['test:ipc-event'],
}));

import { invokeBackend, onBackendEvent } from '../backend';

describe('lib/backend', () => {
  const invoke = vi.fn();
  const on = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    on.mockReset();
    mocks.emitWithErrorHandling.mockReset();
    mocks.socket.on.mockReset();
    mocks.socket.off.mockReset();
    vi.stubGlobal('electronAPI', { backend: { invoke, on } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('invokeBackend', () => {
    it('sends a channel not listed for IPC over the socket, with its options', async () => {
      mocks.emitWithErrorHandling.mockResolvedValue({ a: 1 });

      await expect(invokeBackend('test:socket', { p: 1 }, { timeout: 5 })).resolves.toEqual({
        a: 1,
      });

      expect(mocks.emitWithErrorHandling).toHaveBeenCalledWith(
        'test:socket',
        { p: 1 },
        { timeout: 5 }
      );
      expect(invoke).not.toHaveBeenCalled();
    });

    it('sends a listed channel over IPC only', async () => {
      invoke.mockResolvedValue({ ok: true });

      await expect(invokeBackend('test:ipc', { p: 1 })).resolves.toEqual({ ok: true });

      expect(invoke).toHaveBeenCalledWith('test:ipc', { p: 1 });
      expect(mocks.emitWithErrorHandling).not.toHaveBeenCalled();
    });

    it('turns an error envelope into a rejection with the same message', async () => {
      invoke.mockResolvedValue({ entry: null, error: 'Nie znaleziono' });
      await expect(invokeBackend('test:ipc', {})).rejects.toThrow('Nie znaleziono');
    });

    it('does not treat an undefined error key as an error', async () => {
      const response = { entry: 1, error: undefined };
      invoke.mockResolvedValue(response);
      await expect(invokeBackend('test:ipc', {})).resolves.toBe(response);
    });

    it('passes non-object responses through', async () => {
      invoke.mockResolvedValue(null);
      await expect(invokeBackend('test:ipc', {})).resolves.toBeNull();
    });

    it('times out at the 10 s default', async () => {
      vi.useFakeTimers();
      invoke.mockReturnValue(new Promise(() => {}));

      const call = invokeBackend('test:ipc', {});
      const assertion = expect(call).rejects.toThrow(/timed out after 10000ms/);
      await vi.advanceTimersByTimeAsync(10_000);

      await assertion;
    });

    it('honours a longer call-site timeout', async () => {
      vi.useFakeTimers();
      let release!: (value: unknown) => void;
      invoke.mockReturnValue(new Promise(resolve => (release = resolve)));

      const call = invokeBackend('test:ipc', {}, { timeout: 60_000 });
      await vi.advanceTimersByTimeAsync(59_000);
      release({ ok: true });

      await expect(call).resolves.toEqual({ ok: true });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('surfaces a rejection from main', async () => {
      invoke.mockRejectedValue(new Error('FORBIDDEN'));
      await expect(invokeBackend('test:ipc', {})).rejects.toThrow('FORBIDDEN');
    });

    it('rejects a listed channel when there is no bridge', async () => {
      vi.stubGlobal('electronAPI', undefined);
      await expect(invokeBackend('test:ipc', {})).rejects.toThrow(/bridge is not available/);
    });
  });

  describe('onBackendEvent', () => {
    it('subscribes a socket-only event on the socket alone', () => {
      const callback = vi.fn();

      const unsubscribe = onBackendEvent('test:socket-event', callback);

      expect(mocks.socket.on).toHaveBeenCalledWith('test:socket-event', callback);
      expect(on).not.toHaveBeenCalled();

      unsubscribe();
      expect(mocks.socket.off).toHaveBeenCalledWith('test:socket-event', callback);
    });

    it('subscribes a listed event on both transports and unsubscribes both', () => {
      const unsubscribeIpc = vi.fn();
      on.mockReturnValue(unsubscribeIpc);
      const callback = vi.fn();

      const unsubscribe = onBackendEvent('test:ipc-event', callback);

      expect(mocks.socket.on).toHaveBeenCalledWith('test:ipc-event', callback);
      expect(on).toHaveBeenCalledWith('test:ipc-event', callback);

      unsubscribe();
      expect(mocks.socket.off).toHaveBeenCalledWith('test:ipc-event', callback);
      expect(unsubscribeIpc).toHaveBeenCalledTimes(1);
    });

    it('still subscribes the socket with no bridge', () => {
      vi.stubGlobal('electronAPI', undefined);
      const unsubscribe = onBackendEvent('test:ipc-event', vi.fn());

      expect(mocks.socket.on).toHaveBeenCalledTimes(1);
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
