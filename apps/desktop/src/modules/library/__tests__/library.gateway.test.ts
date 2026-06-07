/**
 * Producer-contract tests for the bulk gateway handlers.
 *
 * The fix coalesces N per-id REMOVE/UPDATE emits into one REMOVE_MANY /
 * UPDATE_MANY request. The new contract these guard: the gateway must broadcast
 * a SINGLE `removed-many` / `updated-many` event carrying the affected set so
 * OTHER connected clients reconcile — and must NOT broadcast when nothing
 * changed (so peers never reconcile against an empty set). Payload validation
 * is delegated to the shared zod schemas; an invalid payload must never reach
 * the service.
 */

import { LibraryEvents, CrudActions } from '@shiroani/shared';
import { LibraryGateway } from '../library.gateway';

interface MockService {
  removeMany: jest.Mock;
  updateMany: jest.Mock;
}

function makeGateway(overrides: Partial<MockService> = {}) {
  const service: MockService = {
    removeMany: jest.fn(),
    updateMany: jest.fn(),
    ...overrides,
  };
  const gateway = new LibraryGateway(service as never);
  const emit = jest.fn();
  gateway.server = { emit } as never;
  return { gateway, service, emit };
}

describe('LibraryGateway.handleRemoveMany', () => {
  it('deletes, broadcasts REMOVED_MANY with the deleted ids, and returns them', async () => {
    const { gateway, service, emit } = makeGateway({
      removeMany: jest.fn().mockReturnValue([1, 2]),
    });

    const result = await gateway.handleRemoveMany({ ids: [1, 2, 3] });

    expect(service.removeMany).toHaveBeenCalledWith([1, 2, 3]);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
      ids: [1, 2],
      action: CrudActions.REMOVED_MANY,
    });
    expect(result).toEqual({ ids: [1, 2] });
  });

  it('does NOT broadcast when nothing was deleted', async () => {
    const { gateway, emit } = makeGateway({ removeMany: jest.fn().mockReturnValue([]) });

    const result = await gateway.handleRemoveMany({ ids: [99] });

    expect(emit).not.toHaveBeenCalled();
    expect(result).toEqual({ ids: [] });
  });

  it('rejects an empty id list via schema without touching the service', async () => {
    const { gateway, service } = makeGateway();

    const result = (await gateway.handleRemoveMany({ ids: [] })) as {
      ids: number[];
      error?: string;
    };

    expect(service.removeMany).not.toHaveBeenCalled();
    expect(result.ids).toEqual([]);
    expect(result.error).toBeDefined();
  });
});

describe('LibraryGateway.handleUpdateMany', () => {
  it('updates, broadcasts UPDATED_MANY with the entries, and returns them', async () => {
    const entries = [{ id: 1 }, { id: 2 }];
    const { gateway, service, emit } = makeGateway({
      updateMany: jest.fn().mockReturnValue(entries),
    });

    const result = await gateway.handleUpdateMany({ ids: [1, 2], status: 'completed' });

    expect(service.updateMany).toHaveBeenCalledWith([1, 2], { status: 'completed' });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(LibraryEvents.UPDATED, {
      entries,
      action: CrudActions.UPDATED_MANY,
    });
    expect(result).toEqual({ entries });
  });

  it('does NOT broadcast when no row changed', async () => {
    const { gateway, emit } = makeGateway({ updateMany: jest.fn().mockReturnValue([]) });

    const result = await gateway.handleUpdateMany({ ids: [1], status: 'completed' });

    expect(emit).not.toHaveBeenCalled();
    expect(result).toEqual({ entries: [] });
  });

  it('rejects an ids-only payload (no updatable field) via schema', async () => {
    const { gateway, service } = makeGateway();

    const result = (await gateway.handleUpdateMany({ ids: [1, 2] })) as {
      entries: unknown[];
      error?: string;
    };

    expect(service.updateMany).not.toHaveBeenCalled();
    expect(result.error).toBeDefined();
  });
});
