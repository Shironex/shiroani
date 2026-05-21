import type { NamedSet } from 'zustand/middleware';
import { emitWithErrorHandling } from '@/lib/socket';
import type { Logger } from '@shiroani/shared';

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
   * Fetch the full collection: flip loading on, request, then commit the
   * result (or record the error). Mutation error paths call this to restore
   * authoritative state.
   */
  const fetchAll = () => {
    set({ isLoading: true } as Partial<TState>, undefined, `${storeName}/fetching`);
    emitWithErrorHandling<Record<string, never>, { entries: TItem[] }>(events.getAll, {})
      .then(data => {
        const entries = data.entries ?? [];
        set(
          { entries, isLoading: false, error: null } as Partial<TState>,
          undefined,
          `${storeName}/result`
        );
      })
      .catch((err: Error) => {
        logger.error(`Failed to fetch ${storeName}:`, err.message);
        set(
          { isLoading: false, error: err.message } as Partial<TState>,
          undefined,
          `${storeName}/fetchError`
        );
      });
  };

  /**
   * Optimistically patch one row, emit the mutation, and re-fetch on failure to
   * restore authoritative state.
   */
  const optimisticUpdate = <TPayload>(config: OptimisticUpdateConfig<TItem, TPayload>) => {
    const { event, payload, id, applyUpdate, label = 'optimisticUpdate' } = config;
    set(
      state =>
        ({
          entries: state.entries.map(e => (e.id === id ? applyUpdate(e, payload) : e)),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    emitWithErrorHandling(event, payload).catch((err: Error) => {
      logger.error(`Failed to update ${storeName} entry:`, err.message);
      fetchAll();
    });
  };

  /**
   * Optimistically remove one row (plus any selection/panel sync via `extra`),
   * emit the mutation, and roll back to the captured snapshot on failure.
   */
  const optimisticRemove = (config: OptimisticRemoveConfig<TState>) => {
    const { event, id, extra, label = 'optimisticRemove' } = config;
    const previousState = get();
    const extraSnapshot = extra?.(previousState) ?? ({} as Partial<TState>);
    set(
      state =>
        ({
          entries: state.entries.filter(e => e.id !== id),
          ...extra?.(state),
        }) as Partial<TState>,
      undefined,
      `${storeName}/${label}`
    );
    emitWithErrorHandling(event, { id }).catch((err: Error) => {
      logger.error(`Failed to remove ${storeName} entry:`, err.message);
      const rollback: Partial<TState> = { entries: previousState.entries } as Partial<TState>;
      for (const key of Object.keys(extraSnapshot) as (keyof TState)[]) {
        (rollback as Record<keyof TState, TState[keyof TState]>)[key] = previousState[key];
      }
      set(rollback, undefined, `${storeName}/removeError`);
    });
  };

  /**
   * Build the handler for the broadcast `UPDATED` event. Dispatches on the
   * `action` field to the supplied add/update/remove callbacks; `imported`
   * triggers a full re-fetch.
   */
  const createUpdatedListener = (config: CrudUpdatedListenerConfig<TItem, TState>) => {
    const { addActions, onAdded, onUpdated, onRemoved, addedLabel = 'entryAdded' } = config;
    return (data: unknown) => {
      const { action } = data as { action: string };
      if (addActions.includes(action)) {
        const { entry } = data as { entry: TItem };
        set(state => onAdded(state, entry), undefined, `${storeName}/${addedLabel}`);
      } else if (action === 'updated') {
        const { entry } = data as { entry: TItem };
        set(state => onUpdated(state, entry), undefined, `${storeName}/entryUpdated`);
      } else if (action === 'removed') {
        const { id } = data as { id: number };
        set(state => onRemoved(state, id), undefined, `${storeName}/entryRemoved`);
      } else if (action === 'imported') {
        fetchAll();
      }
    };
  };

  return { fetchAll, optimisticUpdate, optimisticRemove, createUpdatedListener };
}
