import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeBackend, onBackendEvent } from '../backend';

describe('lib/backend', () => {
  const invoke = vi.fn();
  const on = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    on.mockReset();
    vi.stubGlobal('electronAPI', { backend: { invoke, on } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('invokeBackend', () => {
    it('sends the channel and payload over the bridge', async () => {
      invoke.mockResolvedValue({ ok: true });

      await expect(invokeBackend('test:channel', { p: 1 })).resolves.toEqual({ ok: true });

      expect(invoke).toHaveBeenCalledWith('test:channel', { p: 1 });
    });

    it('turns an error envelope into a rejection with the same message', async () => {
      invoke.mockResolvedValue({ entry: null, error: 'boom' });
      await expect(invokeBackend('test:channel', {})).rejects.toThrow('boom');
    });

    it('does not treat an undefined error key as an error', async () => {
      const response = { entry: 1, error: undefined };
      invoke.mockResolvedValue(response);
      await expect(invokeBackend('test:channel', {})).resolves.toBe(response);
    });

    it('passes non-object responses through', async () => {
      invoke.mockResolvedValue(undefined);
      await expect(invokeBackend('test:channel', {})).resolves.toBeUndefined();
    });

    it('times out at the 10 s default', async () => {
      vi.useFakeTimers();
      invoke.mockReturnValue(new Promise(() => {}));

      const call = invokeBackend('test:channel', {});
      const assertion = expect(call).rejects.toThrow(/timed out after 10000ms/);
      await vi.advanceTimersByTimeAsync(10_000);

      await assertion;
    });

    it('honours a longer call-site timeout', async () => {
      vi.useFakeTimers();
      invoke.mockReturnValue(new Promise(() => {}));

      const call = invokeBackend('test:channel', {}, { timeout: 60_000 });
      let settled = false;
      void call.catch(() => (settled = true));

      await vi.advanceTimersByTimeAsync(59_999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(settled).toBe(true);
    });

    it('surfaces a rejection from main', async () => {
      invoke.mockRejectedValue(new Error('FORBIDDEN'));
      await expect(invokeBackend('test:channel', {})).rejects.toThrow('FORBIDDEN');
    });

    it('rejects when there is no bridge', async () => {
      vi.stubGlobal('electronAPI', undefined);
      await expect(invokeBackend('test:channel', {})).rejects.toThrow(/bridge is not available/);
    });
  });

  describe('onBackendEvent', () => {
    it('subscribes over the bridge and returns its unsubscribe', () => {
      const unsubscribe = vi.fn();
      on.mockReturnValue(unsubscribe);
      const callback = vi.fn();

      const off = onBackendEvent('test:event', callback);
      expect(on).toHaveBeenCalledWith('test:event', callback);

      off();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does nothing with no bridge', () => {
      vi.stubGlobal('electronAPI', undefined);
      expect(() => onBackendEvent('test:event', vi.fn())()).not.toThrow();
    });
  });
});
