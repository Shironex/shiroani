import type { NamedSet } from 'zustand/middleware';
import { toast } from 'sonner';
import { emitWithErrorHandling } from '@/lib/socket';
import i18n from '@/lib/i18n';
import { CrudActions, type CrudAction, type Logger } from '@shiroani/shared';

/**
 * Minimal shape a CRUD entity must satisfy: a numeric identity used for
 * optimistic update/remove matching and listener reconciliation.
 */
interface CrudEntity {
  id: number;
}

/**
 * The slice of socket-store state {@link createCrudResource} reads and writes.
 * Stores extend this with their own filter/sort/selection fields.
 */
interface CrudResourceState<TItem> {
  entries: TItem[];
  isLoading: boolean;
  error: string | null;
}

interface CreateCrudResourceOptions<
  TItem extends CrudEntity,
  TState extends CrudResourceState<TItem>,
> {
  /** Zustand set with devtools action labels. */
  set: NamedSet<TState>;
  /** Zustand get. */
  get: () => TState;
  /** Devtools action-label prefix, e.g. `'library'`. */
  storeName: string;
  /** Store logger used for fetch/mutation error reporting. */
  logger: Logger;
  /** Socket event names for the read + mutation operations. */
  events: {
    /** Request-all event, replied to with `{ entries }`. */
    getAll: string;
  };
}

interface OptimisticUpdateConfig<TItem, TPayload> {
  /** Socket mutation event, e.g. `LibraryEvents.UPDATE`. */
  event: string;
  /** Mutation payload (also carries the target `id`). */
  payload: TPayload;
  /** Target entity id used to locate the row to patch. */
  id: number;
  /** Produce the patched entity from the existing one and the payload. */
  applyUpdate: (existing: TItem, payload: TPayload) => TItem;
  /** Devtools label suffix for the optimistic set (default `'optimisticUpdate'`). */
  label?: string;
}

interface OptimisticRemoveConfig<TState> {
  /** Socket mutation event, e.g. `LibraryEvents.REMOVE`. */
  event: string;
  /** Target entity id to remove. */
  id: number;
  /**
   * Extra partial state merged into the optimistic removal set (e.g. closing a
   * detail panel or clearing the selected entry).
   */
  extra?: (state: TState) => Partial<TState>;
  /** Devtools label suffix for the optimistic set (default `'optimisticRemove'`). */
  label?: string;
}

interface OptimisticUpdateManyConfig<TItem, TPayload> {
  /** Bulk socket mutation event, e.g. `LibraryEvents.UPDATE_MANY`. */
  event: string;
  /** Wire payload — carries the `ids` and the changed fields; emitted as-is. */
  payload: TPayload;
  /** Target entity ids to patch. */
  ids: number[];
  /**
   * Patch applied to every matched row. Pre-bound to the change by the caller so
   * the wire payload (which carries `ids`) never leaks into the entity.
   */
  apply: (existing: TItem) => TItem;
  /** Devtools label suffix for the optimistic set (default `'optimisticUpdateMany'`). */
  label?: string;
}

interface OptimisticRemoveManyConfig<TState> {
  /** Bulk socket mutation event, e.g. `LibraryEvents.REMOVE_MANY`. */
  event: string;
  /** Target entity ids to remove. */
  ids: number[];
  /**
   * Extra partial state merged into the optimistic removal set, computed once
   * over the whole removal set (e.g. closing a detail panel if its entry is
   * among the removed ids).
   */
  extra?: (state: TState) => Partial<TState>;
  /** Devtools label suffix for the optimistic set (default `'optimisticRemoveMany'`). */
  label?: string;
}

/**
 * Listener handlers for the broadcast `UPDATED` event. Each store wires only
 * the actions it cares about; `imported` defaults to a full re-fetch.
 */
interface CrudUpdatedListenerConfig<TItem extends CrudEntity, TState> {
  /** Action names treated as "an entity was created" (e.g. `['added']` / `['created']`). */
  addActions: string[];
  /** Apply a freshly created entity to the list (controls insert position). */
  onAdded: (state: TState, entry: TItem) => Partial<TState>;
  /** Apply an updated entity (and any selection sync). */
  onUpdated: (state: TState, entry: TItem) => Partial<TState>;
  /** Apply a removal by id (and any selection/panel sync). */
  onRemoved: (state: TState, id: number) => Partial<TState>;
  /**
   * Apply a bulk update (the broadcast's authoritative `entries`). Optional —
   * when omitted, a `updated-many` broadcast falls back to a full re-fetch so a
   * store that never emits batches stays correct without extra wiring.
   */
  onUpdatedMany?: (state: TState, entries: TItem[]) => Partial<TState>;
  /**
   * Apply a bulk removal (the broadcast's `ids`). Optional — when omitted, a
   * `removed-many` broadcast falls back to a full re-fetch.
   */
  onRemovedMany?: (state: TState, ids: number[]) => Partial<TState>;
  /** Devtools label suffix for the add path (default `'entryAdded'`). */
  addedLabel?: string;
}

/**
 * Build the shared socket-CRUD action set (`fetchAll`, `optimisticUpdate`,
 * `optimisticRemove`) plus the broadcast `UPDATED` listener handler used by the
 * library and diary stores. Behaviour is identical to the hand-rolled
 * versions: same loading/error transitions, same optimistic-then-rollback
 * semantics, same re-fetch on error.
 */
export function createCrudResource<
  TItem extends CrudEntity,
  TState extends CrudResourceState<TItem>,
>(options: CreateCrudResourceOptions<TItem, TState>) {
  const { set, get, storeName, logger, events } = options;

  /**
   * Two counters keep the loading flag and the data write independent:
   *  - `fetchSeq` is bumped only by `fetchAll`; the latest fetch owns `isLoading`.
   *  - `mutationSeq` is bumped by every optimistic edit / broadcast via `bumpSeq`.
   * A fetch commits its `entries` only if NO mutation happened since it started
   * (so a stale reply can't clobber a newer optimistic edit), but it always
   * clears its own `isLoading` when it is still the latest fetch — otherwise a
   * mutation landing mid-fetch would leave the spinner stuck forever.
   */
  let fetchSeq = 0;
  let mutationSeq = 0;
  /** Mark that authoritative/optimistic state changed, invalidating an in-flight fetch's data write. */
  const bumpSeq = () => {
    mutationSeq += 1;
  };

  /**
   * Build the rollback patch for a failed optimistic removal: restore `entries`
   * plus every key the `extra` snapshot touched, back to their pre-mutation
   * values. Shared by the single ({@link optimisticRemove}) and bulk
   * ({@link optimisticRemoveMany}) remove paths.
   */
  const buildRemoveRollback = (
    previousState: TState,
    extraSnapshot: Partial<TState>
  ): Partial<TState> => {
    const rollback: Partial<TState> = { entries: previousState.entries } as Partial<TState>;
    for (const key of Object.keys(extraSnapshot) as (keyof TState)[]) {
      (rollback as Record<keyof TState, TState[keyof TState]>)[key] = previousState[key];
    }
    return rollback;
  };

  /**
   * Fetch the full collection: flip loading on, request, then commit the
   * result (or record the error). Mutation error paths call this to restore
   * authoritative state. A reply superseded by a newer fetch is dropped
   * entirely; a reply superseded only by a mutation still clears loading but
   * keeps the fresher optimistic `entries`.
   */
  const fetchAll = (): Promise<void> => {
    const myFetch = (fetchSeq += 1);
    const mutationAtStart = mutationSeq;
    set({ isLoading: true } as Partial<TState>, undefined, `${storeName}/fetching`);
    return emitWithErrorHandling<Record<string, never>, { entries: TItem[] }>(events.getAll, {})
      .then(data => {
        if (myFetch !== fetchSeq) return; // a newer fetch owns loading + data now
        if (mutationSeq !== mutationAtStart) {
          // A mutation landed mid-fetch — keep the optimistic entries, just stop loading.
          set(
            { isLoading: false, error: null } as Partial<TState>,
            undefined,
            `${storeName}/result`
          );
          return;
        }
        const entries = data.entries ?? [];
        set(
          { entries, isLoading: false, error: null } as Partial<TState>,
          undefined,
          `${storeName}/result`
        );
      })
      .catch((err: Error) => {
        if (myFetch !== fetchSeq) return; // a newer fetch supersedes this failure
        logger.error(`Failed to fetch ${storeName}:`, err.message);
        set(
          { isLoading: false, error: err.message } as Partial<TState>,
          undefined,
          `${storeName}/fetchError`
        );
        toast.error(i18n.t('common:errors.loadFailed'));
      });
  };

  /**
   * Optimistically patch one row, emit the mutation, and re-fetch on failure to
   * restore authoritative state. Resolves `true` on success, `false` on failure
   * (after toasting + reverting) so callers can gate UI (e.g. closing an editor)
   * on the real outcome instead of assuming success.
   */
  const optimisticUpdate = <TPayload>(
    config: OptimisticUpdateConfig<TItem, TPayload>
  ): Promise<boolean> => {
    const { event, payload, id, applyUpdate, label = 'optimisticUpdate' } = config;
    bumpSeq();
    set(
      state =>
        ({
          entries: state.entries.map(e => (e.id === id ? applyUpdate(e, payload) : e)),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    return emitWithErrorHandling(event, payload)
      .then(() => true)
      .catch((err: Error) => {
        logger.error(`Failed to update ${storeName} entry:`, err.message);
        toast.error(i18n.t('common:errors.saveFailed'));
        fetchAll();
        return false;
      });
  };

  /**
   * Optimistically remove one row (plus any selection/panel sync via `extra`),
   * emit the mutation, and roll back to the captured snapshot on failure.
   */
  const optimisticRemove = (config: OptimisticRemoveConfig<TState>): Promise<boolean> => {
    const { event, id, extra, label = 'optimisticRemove' } = config;
    const previousState = get();
    const extraSnapshot = extra?.(previousState) ?? ({} as Partial<TState>);
    bumpSeq();
    set(
      state =>
        ({
          entries: state.entries.filter(e => e.id !== id),
          ...extra?.(state),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    return emitWithErrorHandling(event, { id })
      .then(() => true)
      .catch((err: Error) => {
        logger.error(`Failed to remove ${storeName} entry:`, err.message);
        set(
          buildRemoveRollback(previousState, extraSnapshot),
          undefined,
          `${storeName}/removeError`
        );
        toast.error(i18n.t('common:errors.removeFailed'));
        return false;
      });
  };

  /**
   * Optimistically patch MANY rows with a single mutation emit, re-fetching on
   * failure to restore authoritative state. The bulk twin of
   * {@link optimisticUpdate}: one socket round-trip for the whole selection
   * (avoids the per-id throttler trip), same loading/seq semantics. The local
   * patch is pre-bound via `apply` so the wire `payload` (which carries `ids`)
   * never leaks onto an entity.
   */
  const optimisticUpdateMany = <TPayload>(
    config: OptimisticUpdateManyConfig<TItem, TPayload>
  ): Promise<boolean> => {
    const { event, payload, ids, apply, label = 'optimisticUpdateMany' } = config;
    if (ids.length === 0) return Promise.resolve(true);
    const idSet = new Set(ids);
    bumpSeq();
    set(
      state =>
        ({
          entries: state.entries.map(e => (idSet.has(e.id) ? apply(e) : e)),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    return emitWithErrorHandling(event, payload)
      .then(() => true)
      .catch((err: Error) => {
        logger.error(`Failed to bulk-update ${storeName} entries:`, err.message);
        toast.error(i18n.t('common:errors.saveFailed'));
        fetchAll();
        return false;
      });
  };

  /**
   * Optimistically remove MANY rows (plus any selection/panel sync via `extra`)
   * with a single mutation emit, rolling back to the captured snapshot on
   * failure. The bulk twin of {@link optimisticRemove}.
   */
  const optimisticRemoveMany = (config: OptimisticRemoveManyConfig<TState>): Promise<boolean> => {
    const { event, ids, extra, label = 'optimisticRemoveMany' } = config;
    if (ids.length === 0) return Promise.resolve(true);
    const previousState = get();
    const extraSnapshot = extra?.(previousState) ?? ({} as Partial<TState>);
    const removed = new Set(ids);
    bumpSeq();
    set(
      state =>
        ({
          entries: state.entries.filter(e => !removed.has(e.id)),
          ...extra?.(state),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    return emitWithErrorHandling(event, { ids })
      .then(() => true)
      .catch((err: Error) => {
        logger.error(`Failed to bulk-remove ${storeName} entries:`, err.message);
        set(
          buildRemoveRollback(previousState, extraSnapshot),
          undefined,
          `${storeName}/removeManyError`
        );
        toast.error(i18n.t('common:errors.removeFailed'));
        return false;
      });
  };

  /**
   * Build the handler for the broadcast `UPDATED` event. Dispatches on the
   * `action` field to the supplied add/update/remove callbacks; `imported`
   * triggers a full re-fetch.
   */
  const createUpdatedListener = (config: CrudUpdatedListenerConfig<TItem, TState>) => {
    const { addActions, onAdded, onUpdated, onRemoved, onUpdatedMany, onRemovedMany } = config;
    const { addedLabel = 'entryAdded' } = config;
    return (data: unknown) => {
      const { action } = data as { action: CrudAction };
      if (addActions.includes(action)) {
        const { entry } = data as { entry: TItem };
        bumpSeq();
        set(state => onAdded(state, entry), undefined, `${storeName}/${addedLabel}`);
      } else if (action === CrudActions.UPDATED) {
        const { entry } = data as { entry: TItem };
        bumpSeq();
        set(state => onUpdated(state, entry), undefined, `${storeName}/entryUpdated`);
      } else if (action === CrudActions.REMOVED) {
        const { id } = data as { id: number };
        bumpSeq();
        set(state => onRemoved(state, id), undefined, `${storeName}/entryRemoved`);
      } else if (action === CrudActions.UPDATED_MANY) {
        // Bulk update: patch the authoritative rows in place, or re-fetch when
        // this store didn't opt into batch handling (always correct, just less
        // efficient — keeps batch-less consumers like diary correct).
        if (onUpdatedMany) {
          const { entries } = data as { entries: TItem[] };
          bumpSeq();
          set(state => onUpdatedMany(state, entries), undefined, `${storeName}/entriesUpdated`);
        } else {
          fetchAll();
        }
      } else if (action === CrudActions.REMOVED_MANY) {
        if (onRemovedMany) {
          const { ids } = data as { ids: number[] };
          bumpSeq();
          set(state => onRemovedMany(state, ids), undefined, `${storeName}/entriesRemoved`);
        } else {
          fetchAll();
        }
      } else if (action === CrudActions.IMPORTED) {
        fetchAll();
      }
    };
  };

  return {
    fetchAll,
    optimisticUpdate,
    optimisticRemove,
    optimisticUpdateMany,
    optimisticRemoveMany,
    createUpdatedListener,
  };
}
