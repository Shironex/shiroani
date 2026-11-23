import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BackendEvents } from '@shiroani/shared';
import { useFeedStore } from '@/stores/useFeedStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useNewTabStore } from '@/stores/useNewTabStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import { useUpdateStore } from '@/stores/useUpdateStore';
import { useAppInitialization } from '../useAppInitialization';

vi.mock('@/lib/logger-bridge', () => ({ installRendererLogBridge: () => () => {} }));

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe('useAppInitialization', () => {
  const fetchLibrary = vi.fn();
  const loadSchedule = vi.fn();
  const loadFeed = vi.fn();
  const listeners = new Map<string, (data: unknown) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    vi.stubGlobal('electronAPI', {
      backend: {
        invoke: vi.fn(() => new Promise(() => {})),
        on: (event: string, callback: (data: unknown) => void) => {
          listeners.set(event, callback);
          return () => listeners.delete(event);
        },
      },
    });
    useLibraryStore.setState({ loadInitialData: fetchLibrary });
    useScheduleStore.setState({ loadInitialData: loadSchedule });
    useFeedStore.setState({ loadInitialData: loadFeed });
    useUpdateStore.setState({ initListeners: () => () => {} });
    useQuickAccessStore.setState({ loadSites: vi.fn(async () => {}) });
    useNewTabStore.setState({ initNewTab: vi.fn(async () => {}) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads first data exactly once under StrictMode, then reports ready', async () => {
    const { result } = renderHook(() => useAppInitialization(), { wrapper: strict });

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(fetchLibrary).toHaveBeenCalledTimes(1);
    expect(loadSchedule).toHaveBeenCalledTimes(1);
    expect(loadFeed).toHaveBeenCalledTimes(1);
  });

  it('refetches schedule and feed, not the library, after the system resumes', async () => {
    const { result } = renderHook(() => useAppInitialization());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => listeners.get(BackendEvents.RESUMED)?.(undefined));

    expect(loadSchedule).toHaveBeenCalledTimes(2);
    expect(loadFeed).toHaveBeenCalledTimes(2);
    expect(fetchLibrary).toHaveBeenCalledTimes(1);
  });

  it('stops listening for resume on unmount', async () => {
    const { result, unmount } = renderHook(() => useAppInitialization());
    await waitFor(() => expect(result.current.ready).toBe(true));

    unmount();

    expect(listeners.has(BackendEvents.RESUMED)).toBe(false);
  });

  it('reports an error and loads nothing when the bridge is missing', async () => {
    vi.stubGlobal('electronAPI', undefined);

    const { result } = renderHook(() => useAppInitialization());

    await waitFor(() => expect(result.current.error).toMatch(/electronAPI not available/));
    expect(result.current.ready).toBe(false);
    expect(fetchLibrary).not.toHaveBeenCalled();
  });
});
