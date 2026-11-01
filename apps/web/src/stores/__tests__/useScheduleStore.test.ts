import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleEvents, type AiringAnime } from '@shiroani/shared';
import { invokeBackend } from '@/lib/backend';
import { useScheduleStore } from '../useScheduleStore';

vi.mock('@/lib/backend', () => ({
  invokeBackend: vi.fn(),
  onBackendEvent: vi.fn(() => () => {}),
}));

const invoke = vi.mocked(invokeBackend);
const ENTRY = { id: 1 } as AiringAnime;
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useScheduleStore', () => {
  beforeEach(() => {
    invoke.mockReset();
    useScheduleStore.setState({ schedule: {}, isLoading: false, error: null });
  });

  it('renders a daily schedule from the response alone', async () => {
    invoke.mockResolvedValue({ date: '2026-11-02', entries: [ENTRY] });

    useScheduleStore.getState().fetchDaily('2026-11-02');
    expect(useScheduleStore.getState().isLoading).toBe(true);
    await flush();

    const state = useScheduleStore.getState();
    expect(invoke.mock.calls[0][0]).toBe(ScheduleEvents.GET_DAILY);
    expect(state.schedule['2026-11-02']).toEqual([ENTRY]);
    expect(state.isLoading).toBe(false);
  });

  it('merges a weekly schedule from the response into the cached days', async () => {
    useScheduleStore.setState({ schedule: { '2026-10-01': [ENTRY] } });
    invoke.mockResolvedValue({ schedule: { '2026-11-02': [ENTRY] } });

    useScheduleStore.getState().fetchWeekly('2026-11-02');
    await flush();

    expect(Object.keys(useScheduleStore.getState().schedule).sort()).toEqual([
      '2026-10-01',
      '2026-11-02',
    ]);
  });

  it('keeps cached days and reports the error when a fetch fails', async () => {
    useScheduleStore.setState({ schedule: { '2026-11-02': [ENTRY] } });
    invoke.mockRejectedValue(new Error('offline'));

    useScheduleStore.getState().fetchDaily('2026-11-02');
    await flush();

    const state = useScheduleStore.getState();
    expect(state.schedule['2026-11-02']).toEqual([ENTRY]);
    expect(state.error).toBe('offline');
    expect(state.isLoading).toBe(false);
  });

  it('clears an earlier error once a fetch succeeds, since the view shows the error first', async () => {
    useScheduleStore.setState({ error: 'offline' });
    invoke.mockResolvedValue({ date: '2026-11-02', entries: [] });

    useScheduleStore.getState().fetchDaily('2026-11-02');
    await flush();

    expect(useScheduleStore.getState().error).toBeNull();
  });

  it('waits longer than the default timeout, because AniList retries can take over a minute', () => {
    invoke.mockResolvedValue({ schedule: {} });

    useScheduleStore.getState().fetchWeekly('2026-11-02');

    expect(invoke.mock.calls[0][2]?.timeout).toBeGreaterThanOrEqual(74_000);
  });
});
