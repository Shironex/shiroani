import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBackgroundStore } from '../useBackgroundStore';

const electronStoreData = new Map<string, unknown>();
vi.mock('@/lib/electron-store', () => ({
  electronStoreGet: vi.fn(async (key: string) => electronStoreData.get(key)),
  electronStoreSet: vi.fn(async (key: string, value: unknown) => {
    electronStoreData.set(key, value);
  }),
  electronStoreDelete: vi.fn(async (key: string) => {
    electronStoreData.delete(key);
  }),
}));

const STORED = { fileName: 'bg-new.png', url: 'shiroani-bg://backgrounds/bg-new.png' };

function stubBackgroundApi() {
  const api = {
    pick: vi.fn().mockResolvedValue(STORED),
    remove: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn(),
    addFromBytes: vi.fn().mockResolvedValue({ ok: true, ...STORED }),
  };
  vi.stubGlobal('electronAPI', { background: api });
  return api;
}

describe('useBackgroundStore', () => {
  beforeEach(() => {
    electronStoreData.clear();
    useBackgroundStore.setState({
      customBackground: 'shiroani-bg://backgrounds/bg-old.png',
      customBackgroundFileName: 'bg-old.png',
      backgroundOpacity: 0.3,
      backgroundBlur: 4,
      backgroundDim: 0.5,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--app-bg-image');
  });

  describe('addBackgroundFromBytes', () => {
    it('sends the bytes to main and activates the stored file like the picker does', async () => {
      const api = stubBackgroundApi();
      const bytes = new Uint8Array([1, 2, 3]);

      const result = await useBackgroundStore.getState().addBackgroundFromBytes(bytes);

      expect(result).toEqual({ ok: true, ...STORED });
      expect(api.addFromBytes).toHaveBeenCalledWith(bytes);
      expect(api.remove).toHaveBeenCalledWith('bg-old.png');
      const state = useBackgroundStore.getState();
      expect(state.customBackground).toBe(STORED.url);
      expect(state.customBackgroundFileName).toBe(STORED.fileName);
      expect(document.documentElement.style.getPropertyValue('--app-bg-image')).toBe(
        `url(${STORED.url})`
      );
      expect(electronStoreData.get('custom-backgrounds')).toEqual({
        ...STORED,
        opacity: 0.3,
        blur: 4,
        dim: 0.5,
      });
    });

    it('changes nothing when main rejects the bytes', async () => {
      const api = stubBackgroundApi();
      api.addFromBytes.mockResolvedValue({ ok: false, reason: 'not-an-image' });

      const result = await useBackgroundStore.getState().addBackgroundFromBytes(new Uint8Array());

      expect(result).toEqual({ ok: false, reason: 'not-an-image' });
      expect(api.remove).not.toHaveBeenCalled();
      expect(useBackgroundStore.getState().customBackgroundFileName).toBe('bg-old.png');
      expect(electronStoreData.has('custom-backgrounds')).toBe(false);
    });

    it('throws when the IPC call fails so the caller can tell the user', async () => {
      const api = stubBackgroundApi();
      api.addFromBytes.mockRejectedValue(new Error('ipc down'));

      await expect(
        useBackgroundStore.getState().addBackgroundFromBytes(new Uint8Array())
      ).rejects.toThrow('ipc down');
    });
  });

  describe('pickBackground', () => {
    it('still activates the picked file and removes the previous one', async () => {
      const api = stubBackgroundApi();

      await useBackgroundStore.getState().pickBackground();

      expect(api.remove).toHaveBeenCalledWith('bg-old.png');
      expect(useBackgroundStore.getState().customBackgroundFileName).toBe(STORED.fileName);
      expect(electronStoreData.get('custom-backgrounds')).toMatchObject(STORED);
    });

    it('does nothing when the picker is cancelled', async () => {
      const api = stubBackgroundApi();
      api.pick.mockResolvedValue(null);

      await useBackgroundStore.getState().pickBackground();

      expect(api.remove).not.toHaveBeenCalled();
      expect(useBackgroundStore.getState().customBackgroundFileName).toBe('bg-old.png');
    });
  });
});
