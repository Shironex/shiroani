import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useMascotSpriteStore } from '../useMascotSpriteStore';

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

const STORED = { fileName: 'sprite-new.gif', url: 'shiroani-mascot://sprites/sprite-new.gif' };

function stubOverlayApi() {
  const api = {
    pickSprite: vi.fn().mockResolvedValue(STORED),
    addSpriteFromBytes: vi.fn().mockResolvedValue({ ok: true, ...STORED }),
  };
  vi.stubGlobal('electronAPI', { overlay: api });
  return api;
}

describe('useMascotSpriteStore', () => {
  beforeEach(() => {
    electronStoreData.clear();
    useMascotSpriteStore.setState({
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: 'cover',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('addSpriteFromBytes', () => {
    it('sends the bytes to main and mirrors the stored sprite like the picker does', async () => {
      const api = stubOverlayApi();
      const bytes = new Uint8Array([7, 8, 9]);

      const result = await useMascotSpriteStore.getState().addSpriteFromBytes(bytes);

      expect(result).toEqual({ ok: true, ...STORED });
      expect(api.addSpriteFromBytes).toHaveBeenCalledWith(bytes);
      const state = useMascotSpriteStore.getState();
      expect(state.customSpriteUrl).toBe(STORED.url);
      expect(state.customSpriteFileName).toBe(STORED.fileName);
      expect(electronStoreData.get('custom-mascot-sprite')).toEqual({
        ...STORED,
        scaleMode: 'cover',
      });
    });

    it('changes nothing when main rejects the bytes', async () => {
      const api = stubOverlayApi();
      api.addSpriteFromBytes.mockResolvedValue({ ok: false, reason: 'dimensions-too-large' });

      const result = await useMascotSpriteStore.getState().addSpriteFromBytes(new Uint8Array());

      expect(result).toEqual({ ok: false, reason: 'dimensions-too-large' });
      expect(useMascotSpriteStore.getState().customSpriteFileName).toBeNull();
      expect(electronStoreData.has('custom-mascot-sprite')).toBe(false);
    });
  });

  describe('pickSprite', () => {
    it('still mirrors the picked sprite', async () => {
      stubOverlayApi();

      await useMascotSpriteStore.getState().pickSprite();

      expect(useMascotSpriteStore.getState().customSpriteFileName).toBe(STORED.fileName);
      expect(electronStoreData.get('custom-mascot-sprite')).toMatchObject(STORED);
    });
  });
});
