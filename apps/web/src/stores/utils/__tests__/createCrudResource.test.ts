import { describe, it, expect, vi, beforeEach } from 'vitest';

const { emitWithErrorHandling } = vi.hoisted(() => ({
  emitWithErrorHandling: vi.fn(),
}));

vi.mock('@/lib/socket', () => ({ emitWithErrorHandling }));

import { createCrudResource } from '../createCrudResource';
import type { Logger } from '@shiroani/shared';

interface TestItem {
  id: number;
  name: string;
}

interface TestState {
  entries: TestItem[];
  isLoading: boolean;
  error: string | null;
  isDetailOpen: boolean;
  selectedEntry: TestItem | null;
}

function makeTestStore(initial: Partial<TestState> = {}) {
  // Use a container so `get()` always returns the current snapshot reference,
  // mirroring Zustand's behaviour: each `set` replaces the stored object so
  // a `get()` captured *before* a `set` is not mutated by that `set`.
  let current: TestState = {
    entries: [],
    isLoading: false,
    error: null,
    isDetailOpen: false,
    selectedEntry: null,
    ...initial,
  };

  const set = (
    updater: Partial<TestState> | ((s: TestState) => Partial<TestState>),
    _replace?: boolean,
    _label?: string
  ) => {
    const patch = typeof updater === 'function' ? updater(current) : updater;
    current = { ...current, ...patch };
  };

  const get = () => current;

  // Expose a proxy object so tests can read `state.entries` etc. after mutations
  const state = new Proxy({} as TestState, {
    get(_t, prop) {
      return current[prop as keyof TestState];
    },
  });

  return { state, set, get };
}

const silentLogger: Logger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
} as unknown as Logger;

describe('createCrudResource — optimisticRemove rollback', () => {
  beforeEach(() => {
    emitWithErrorHandling.mockReset();
  });

  it('on success: removes the entry and applies extra state', async () => {
    const entry: TestItem = { id: 1, name: 'Naruto' };
    const { state, set, get } = makeTestStore({
      entries: [entry],
      isDetailOpen: true,
      selectedEntry: entry,
    });

    const crud = createCrudResource<TestItem, TestState>({
      set: set as Parameters<typeof createCrudResource<TestItem, TestState>>[0]['set'],
      get,
      storeName: 'test',
      logger: silentLogger,
      events: { getAll: 'test/getAll' },
    });

    emitWithErrorHandling.mockResolvedValue({});

    crud.optimisticRemove({
      event: 'test/remove',
      id: 1,
      extra: () => ({ isDetailOpen: false, selectedEntry: null }),
    });

    await Promise.resolve();

    expect(state.entries).toHaveLength(0);
    expect(state.isDetailOpen).toBe(false);
    expect(state.selectedEntry).toBeNull();
  });

  it('on failure: restores entries AND extra state to pre-mutation values', async () => {
    const entry: TestItem = { id: 2, name: 'One Piece' };
    const { state, set, get } = makeTestStore({
      entries: [entry],
      isDetailOpen: true,
      selectedEntry: entry,
    });

    const crud = createCrudResource<TestItem, TestState>({
      set: set as Parameters<typeof createCrudResource<TestItem, TestState>>[0]['set'],
      get,
      storeName: 'test',
      logger: silentLogger,
      events: { getAll: 'test/getAll' },
    });

    emitWithErrorHandling.mockRejectedValue(new Error('network error'));

    crud.optimisticRemove({
      event: 'test/remove',
      id: 2,
      extra: () => ({ isDetailOpen: false, selectedEntry: null }),
    });

    // After optimistic apply, entry is removed and extra applied
    expect(state.entries).toHaveLength(0);
    expect(state.isDetailOpen).toBe(false);
    expect(state.selectedEntry).toBeNull();

    // Let the rejection propagate
    await Promise.resolve();
    await Promise.resolve();

    // Rollback must restore both entries AND extra fields
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].id).toBe(2);
    expect(state.isDetailOpen).toBe(true);
    expect(state.selectedEntry).toEqual(entry);
  });

  it('on failure without extra: restores only entries', async () => {
    const entry: TestItem = { id: 3, name: 'Bleach' };
    const { state, set, get } = makeTestStore({
      entries: [entry],
    });

    const crud = createCrudResource<TestItem, TestState>({
      set: set as Parameters<typeof createCrudResource<TestItem, TestState>>[0]['set'],
      get,
      storeName: 'test',
      logger: silentLogger,
      events: { getAll: 'test/getAll' },
    });

    emitWithErrorHandling.mockRejectedValue(new Error('timeout'));

    crud.optimisticRemove({ event: 'test/remove', id: 3 });

    await Promise.resolve();
    await Promise.resolve();

    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].id).toBe(3);
  });

  it('on failure with conditional extra: restores to correct pre-mutation values', async () => {
    const targetEntry: TestItem = { id: 4, name: 'FMA' };
    const otherEntry: TestItem = { id: 5, name: 'Code Geass' };
    // selectedEntry is a DIFFERENT entry — extra's conditional should keep it open
    const { state, set, get } = makeTestStore({
      entries: [targetEntry, otherEntry],
      isDetailOpen: true,
      selectedEntry: otherEntry,
    });

    const crud = createCrudResource<TestItem, TestState>({
      set: set as Parameters<typeof createCrudResource<TestItem, TestState>>[0]['set'],
      get,
      storeName: 'test',
      logger: silentLogger,
      events: { getAll: 'test/getAll' },
    });

    emitWithErrorHandling.mockRejectedValue(new Error('server error'));

    crud.optimisticRemove({
      event: 'test/remove',
      id: 4,
      extra: s => ({
        isDetailOpen: s.selectedEntry?.id === 4 ? false : s.isDetailOpen,
        selectedEntry: s.selectedEntry?.id === 4 ? null : s.selectedEntry,
      }),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(state.entries).toHaveLength(2);
    expect(state.isDetailOpen).toBe(true);
    expect(state.selectedEntry).toEqual(otherEntry);
  });
});
