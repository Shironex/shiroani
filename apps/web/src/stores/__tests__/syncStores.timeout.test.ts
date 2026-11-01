import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeBackend, onBackendEvent } from '@/lib/backend';
import { useAniListSyncStore } from '../useAniListSyncStore';
import { useMalSyncStore } from '../useMalSyncStore';

vi.mock('@/lib/backend', () => ({
  invokeBackend: vi.fn(),
  onBackendEvent: vi.fn(() => () => {}),
}));

const TWENTY_MINUTES_MS = 1_200_000;

describe.each([
  ['AniList', useAniListSyncStore, 'anilist-sync:run', 'anilist-sync:progress'],
  ['MAL', useMalSyncStore, 'mal-sync:run', 'mal-sync:progress'],
] as const)('%s full sync', (_name, store, channel, progressChannel) => {
  beforeEach(() => {
    vi.mocked(invokeBackend).mockReset();
    vi.mocked(onBackendEvent).mockClear();
    vi.mocked(invokeBackend).mockResolvedValue({ imported: 0 });
  });

  it('keeps the 20 minute timeout and listens for progress', async () => {
    await store.getState().sync({ direction: 'two-way' });

    expect(invokeBackend).toHaveBeenCalledWith(
      channel,
      { direction: 'two-way' },
      { timeout: TWENTY_MINUTES_MS }
    );
    expect(vi.mocked(onBackendEvent).mock.calls[0][0]).toBe(progressChannel);
  });
});
