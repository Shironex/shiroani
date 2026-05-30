import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimeDetection } from '@/lib/anime-detection';

const mocks = vi.hoisted(() => ({
  autoTrackProgress: true,
  entries: [] as unknown[],
  updateEntry: vi.fn(),
  matchEntry: vi.fn(),
  computeAdvance: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess } }));
vi.mock('@/lib/i18n', () => ({ default: { t: (k: string) => k } }));
vi.mock('@shiroani/shared', () => ({ createLogger: () => ({ debug: vi.fn() }) }));

vi.mock('@/stores/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ autoTrackProgress: mocks.autoTrackProgress }),
  },
}));
vi.mock('@/stores/useLibraryStore', () => ({
  useLibraryStore: {
    getState: () => ({ entries: mocks.entries, updateEntry: mocks.updateEntry }),
  },
}));
vi.mock('@/lib/progress-tracking', () => ({
  matchEntry: (...a: unknown[]) => mocks.matchEntry(...a),
  computeAdvance: (...a: unknown[]) => mocks.computeAdvance(...a),
}));

import { trackDetectedProgress } from '@/lib/progress-tracker';

const DWELL_MS = 8_000;

function det(title: string, episode: number): AnimeDetection {
  return { animeTitle: title, episode } as unknown as AnimeDetection;
}

describe('trackDetectedProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.autoTrackProgress = true;
    mocks.entries = [{ id: 'e1', title: 'Show' }];
    mocks.updateEntry.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.matchEntry.mockReset().mockReturnValue({ id: 'e1', title: 'Show' });
    mocks.computeAdvance.mockReset().mockImplementation((_e, ep: number) => ep);
  });

  afterEach(() => {
    // Drain any pending tracker state between tests.
    trackDetectedProgress(null);
    vi.useRealTimers();
  });

  it('does not fire a stale Ep 6 timer when navigating back to an already-bumped Ep 5', () => {
    // Ep 5 dwells and commits → lastBumpKey === 'Ep 5'.
    trackDetectedProgress(det('Show', 5));
    vi.advanceTimersByTime(DWELL_MS);
    expect(mocks.updateEntry).toHaveBeenCalledTimes(1);
    expect(mocks.updateEntry).toHaveBeenLastCalledWith({ id: 'e1', currentEpisode: 5 });

    // Navigate to Ep 6 (starts an 8s dwell), then quickly back to Ep 5.
    trackDetectedProgress(det('Show', 6));
    vi.advanceTimersByTime(1_000);
    trackDetectedProgress(det('Show', 5)); // matches lastBumpKey, early return

    // The Ep 6 timer must have been cleared — no spurious bump to Ep 6.
    vi.advanceTimersByTime(DWELL_MS);
    expect(mocks.updateEntry).toHaveBeenCalledTimes(1);
    expect(mocks.updateEntry).not.toHaveBeenCalledWith({ id: 'e1', currentEpisode: 6 });
  });
});
