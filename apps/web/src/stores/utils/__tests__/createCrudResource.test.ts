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

function makeCrud(initial: Partial<TestState> = {}) {
  const store = makeTestStore(initial);
  const crud = createCrudResource<TestItem, TestState>({
    set: store.set as Parameters<typeof createCrudResource<TestItem, TestState>>[0]['set'],
    get: store.get,
    storeName: 'test',
    logger: silentLogger,
    events: { getAll: 'test/getAll' },
  });
  return { ...store, crud };
}

// The regression these guard: the library batch action bar used to fire ONE
// socket emit per selected id (batchRemove/batchUpdateStatus/batchUpdateScore),
// tripping the WS throttler on a large selection. The bulk primitives coalesce
// the whole selection into a single emit.
describe('createCrudResource — optimisticRemoveMany (bulk delete)', () => {
  beforeEach(() => {
    emitWithErrorHandling.mockReset();
  });

  it('removes every targeted id with a SINGLE emit and applies extra', async () => {
    const { state, crud } = makeCrud({
      entries: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
      isDetailOpen: true,
      selectedEntry: { id: 2, name: 'b' },
    });
    emitWithErrorHandling.mockResolvedValue({});

    crud.optimisticRemoveMany({
      event: 'test/removeMany',
      ids: [1, 3],
      extra: s =>
        s.selectedEntry && [1, 3].includes(s.selectedEntry.id)
          ? { isDetailOpen: false, selectedEntry: null }
          : {},
    });
    await Promise.resolve();

    expect(state.entries.map(e => e.id)).toEqual([2]);
    // One emit for the whole batch — NOT one per id.
    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    expect(emitWithErrorHandling).toHaveBeenCalledWith('test/removeMany', { ids: [1, 3] });
    // Open entry (id 2) survived → detail stays open.
    expect(state.isDetailOpen).toBe(true);
  });

  it('on failure: rolls back entries AND extra to pre-mutation values', async () => {
    const open: TestItem = { id: 1, name: 'a' };
    const { state, crud } = makeCrud({
      entries: [open, { id: 2, name: 'b' }],
      isDetailOpen: true,
      selectedEntry: open,
    });
    emitWithErrorHandling.mockRejectedValue(new Error('network error'));

    crud.optimisticRemoveMany({
      event: 'test/removeMany',
      ids: [1, 2],
      extra: () => ({ isDetailOpen: false, selectedEntry: null }),
    });

    // Optimistic: both removed, detail closed.
    expect(state.entries).toHaveLength(0);
    expect(state.isDetailOpen).toBe(false);

    await Promise.resolve();
    await Promise.resolve();

    // Rollback restores both entries and the panel.
    expect(state.entries.map(e => e.id)).toEqual([1, 2]);
    expect(state.isDetailOpen).toBe(true);
    expect(state.selectedEntry).toEqual(open);
  });

  it('no-ops on an empty id list (no emit)', async () => {
    const { crud } = makeCrud({ entries: [{ id: 1, name: 'a' }] });
    emitWithErrorHandling.mockResolvedValue({});

    const result = await crud.optimisticRemoveMany({ event: 'test/removeMany', ids: [] });

    expect(result).toBe(true);
    expect(emitWithErrorHandling).not.toHaveBeenCalled();
  });
});

describe('createCrudResource — optimisticUpdateMany (bulk update)', () => {
  beforeEach(() => {
    emitWithErrorHandling.mockReset();
  });

  it('patches matched rows via apply with a SINGLE emit, leaving others untouched', async () => {
    const { state, crud } = makeCrud({
      entries: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
    });
    emitWithErrorHandling.mockResolvedValue({});

    crud.optimisticUpdateMany({
      event: 'test/updateMany',
      payload: { ids: [1, 3], name: 'X' },
      ids: [1, 3],
      apply: e => ({ ...e, name: 'X' }),
    });
    await Promise.resolve();

    expect(state.entries.find(e => e.id === 1)?.name).toBe('X');
    expect(state.entries.find(e => e.id === 2)?.name).toBe('b');
    expect(state.entries.find(e => e.id === 3)?.name).toBe('X');
    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    expect(emitWithErrorHandling).toHaveBeenCalledWith('test/updateMany', {
      ids: [1, 3],
      name: 'X',
    });
  });

  it('on failure: re-fetches authoritative state', async () => {
    const { state, crud } = makeCrud({ entries: [{ id: 1, name: 'a' }] });
    emitWithErrorHandling
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ entries: [{ id: 1, name: 'server' }] });

    crud.optimisticUpdateMany({
      event: 'test/updateMany',
      payload: { ids: [1], name: 'X' },
      ids: [1],
      apply: e => ({ ...e, name: 'X' }),
    });

    // Optimistic patch shows first.
    expect(state.entries[0].name).toBe('X');

    await vi.waitFor(() => expect(state.entries[0].name).toBe('server'));
    expect(emitWithErrorHandling).toHaveBeenCalledWith('test/getAll', {});
  });

  it('no-ops on an empty id list (no emit)', async () => {
    const { crud } = makeCrud({ entries: [{ id: 1, name: 'a' }] });
    emitWithErrorHandling.mockResolvedValue({});

    const result = await crud.optimisticUpdateMany({
      event: 'test/updateMany',
      payload: { ids: [], name: 'X' },
      ids: [],
      apply: e => ({ ...e, name: 'X' }),
    });

    expect(result).toBe(true);
    expect(emitWithErrorHandling).not.toHaveBeenCalled();
  });
});

// The producer/consumer contract: the gateway broadcasts `removed-many` /
// `updated-many` and OTHER clients must reconcile their lists — or silently
// desync after a bulk op.
describe('createCrudResource — createUpdatedListener bulk broadcasts', () => {
  const baseConfig = {
    addActions: ['added'],
    onAdded: (s: TestState, e: TestItem) => ({ entries: [...s.entries, e] }),
    onUpdated: (s: TestState, e: TestItem) => ({
      entries: s.entries.map(x => (x.id === e.id ? e : x)),
    }),
    onRemoved: (s: TestState, id: number) => ({ entries: s.entries.filter(x => x.id !== id) }),
  };

  beforeEach(() => {
    emitWithErrorHandling.mockReset();
  });

  it('REMOVED_MANY with onRemovedMany prunes in place (no re-fetch)', () => {
    const { state, crud } = makeCrud({
      entries: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
      ],
    });
    const listener = crud.createUpdatedListener({
      ...baseConfig,
      onRemovedMany: (s, ids) => {
        const r = new Set(ids);
        return { entries: s.entries.filter(x => !r.has(x.id)) };
      },
    });

    listener({ action: 'removed-many', ids: [1, 3] });

    expect(state.entries.map(e => e.id)).toEqual([2]);
    expect(emitWithErrorHandling).not.toHaveBeenCalled();
  });

  it('REMOVED_MANY without onRemovedMany falls back to a full re-fetch', () => {
    const { crud } = makeCrud({ entries: [{ id: 1, name: 'a' }] });
    emitWithErrorHandling.mockResolvedValue({ entries: [] });
    const listener = crud.createUpdatedListener({ ...baseConfig });

    listener({ action: 'removed-many', ids: [1] });

    expect(emitWithErrorHandling).toHaveBeenCalledWith('test/getAll', {});
  });

  it('UPDATED_MANY with onUpdatedMany patches the authoritative rows', () => {
    const { state, crud } = makeCrud({
      entries: [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ],
    });
    const listener = crud.createUpdatedListener({
      ...baseConfig,
      onUpdatedMany: (s, entries) => {
        const m = new Map(entries.map(e => [e.id, e]));
        return { entries: s.entries.map(e => m.get(e.id) ?? e) };
      },
    });

    listener({ action: 'updated-many', entries: [{ id: 1, name: 'Z' }] });

    expect(state.entries.find(e => e.id === 1)?.name).toBe('Z');
    expect(state.entries.find(e => e.id === 2)?.name).toBe('b');
  });

  it('UPDATED_MANY without onUpdatedMany falls back to a full re-fetch', () => {
    const { crud } = makeCrud({ entries: [{ id: 1, name: 'a' }] });
    emitWithErrorHandling.mockResolvedValue({ entries: [] });
    const listener = crud.createUpdatedListener({ ...baseConfig });

    listener({ action: 'updated-many', entries: [{ id: 1, name: 'Z' }] });

    expect(emitWithErrorHandling).toHaveBeenCalledWith('test/getAll', {});
  });
});
