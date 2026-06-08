/**
 * Provider-agnostic two-way sync engine.
 *
 * This is the orchestration extracted verbatim (behaviour-for-behaviour) from the
 * original `AniListSyncService` — dedup by provider id, start-of-run snapshot, the
 * optimistic re-read guard, the import → reconcile → push loop, per-entry progress
 * and the success-only tally — but parameterized by a {@link SyncProviderAdapter}.
 * The engine deliberately knows NOTHING about AniList vs MAL: no reconcile import,
 * no client, no DB. The adapter performs the merge + every read/write.
 *
 * The SINGLE-FLIGHT guard lives in the calling service (synchronous claim before
 * the first `await`, released in a `finally`), not here — so the engine is a pure
 * algorithm and a per-service-instance guard semantics is preserved.
 */

import {
  createLogger,
  extractErrorMessage,
  type SyncProgress,
  type SyncResult,
  type SyncAction,
  type FullSyncRequest,
  type FullSyncPushMode,
} from '@shiroani/shared';
import type {
  RemoteEntryCore,
  SyncEntryAction,
  SyncLibraryPort,
  SyncLocalRow,
  SyncProviderAdapter,
} from './sync-engine.types';

const logger = createLogger('ProviderSyncEngine');

function emptyResult(): SyncResult {
  return {
    imported: 0,
    pushedNew: 0,
    updatedLocal: 0,
    updatedRemote: 0,
    unchanged: 0,
    conflicts: 0,
    skippedNoId: 0,
    errors: 0,
  };
}

/**
 * Drives the full + per-entry sync algorithm against any provider adapter. One
 * engine instance is cheap and stateless — construct it per service (or per run);
 * it holds no cross-call state (no single-flight flag — that's the caller's job).
 */
export class ProviderSyncEngine<R extends RemoteEntryCore> {
  constructor(
    private readonly adapter: SyncProviderAdapter<R>,
    private readonly library: SyncLibraryPort
  ) {}

  /**
   * Run a full-library sync in the requested direction. Reports per-entry progress
   * via `onProgress` and resolves with the final tally. The caller owns the
   * single-flight guard and the connected-account check (the adapter's
   * {@link SyncProviderAdapter.getViewerId} throws if not connected).
   *
   * Defaults to `two-way` so the original callers — and the original behaviour —
   * are preserved byte-for-byte. The new directions only ever WRITE one side:
   *
   * - `two-way` — import remote-only, push local-only, merge matches (the original).
   * - `push`    — local → remote only. `create-missing` writes only remote-absent
   *               entries; `overwrite` writes every local entry (local wins). Never
   *               imports or modifies the local library.
   * - `pull`    — remote → local only. Imports remote-only entries and overwrites
   *               matched local rows from the remote (remote wins). Never writes to
   *               the remote account; leaves local-only rows untouched.
   */
  async runFullSync(
    onProgress: (progress: SyncProgress) => void,
    options: FullSyncRequest = { direction: 'two-way' }
  ): Promise<SyncResult> {
    switch (options.direction) {
      case 'push':
        // pushMode is schema-required for push; default to the non-destructive
        // create-missing if it ever arrives absent.
        return this.runPush(onProgress, options.pushMode ?? 'create-missing');
      case 'pull':
        return this.runPull(onProgress);
      case 'two-way':
      default:
        return this.runTwoWay(onProgress);
    }
  }

  /**
   * The original two-way reconcile, extracted verbatim. Import remote-only,
   * reconcile matches (latest-wins merge), then push local-only.
   */
  private async runTwoWay(onProgress: (progress: SyncProgress) => void): Promise<SyncResult> {
    const result = emptyResult();
    const { remoteUnique, remoteById, localEntries, localById } = await this.snapshot();

    // Work items: every unique remote entry, every local-only entry (with or
    // without a provider id).
    const localOnly = localEntries.filter(row => {
      const pid = this.adapter.providerMediaId(row);
      return pid == null || !remoteById.has(pid);
    });
    const report = this.makeReporter(remoteUnique.length + localOnly.length, onProgress);

    // 1. Remote entries: import new, or reconcile existing matches.
    for (const remote of remoteUnique) {
      try {
        const local = localById.get(remote.mediaId);
        if (!local) {
          await this.adapter.importRemote(remote);
          result.imported += 1;
          report(remote.title, 'imported');
          continue;
        }

        // Optimistic concurrency guard: the snapshot was taken at the start of the
        // run, but the user can edit OR delete a library entry while the
        // (potentially multi-minute) sync is in flight. Re-read the row right
        // before writing; skip it this run if it changed since the snapshot (don't
        // clobber the fresh edit) or vanished (don't write a deleted row / push a
        // just-deleted entry). It reconciles on the next sync.
        if (!this.rowUnchanged(local)) {
          report(local.title, 'unchanged');
          continue;
        }

        const outcome = await this.adapter.reconcileMatch(local, remote);

        // Tally only after all writes for this entry succeed, so an entry is
        // counted once — never in both a success counter AND `errors` if a write
        // throws partway through.
        if (outcome.localUpdated) result.updatedLocal += 1;
        if (outcome.remoteUpdated) result.updatedRemote += 1;
        if (outcome.conflict) result.conflicts += 1;

        if (outcome.localUpdated || outcome.remoteUpdated) {
          report(local.title, 'updated');
        } else {
          result.unchanged += 1;
          report(local.title, 'unchanged');
        }
      } catch (error) {
        result.errors += 1;
        logger.error(
          `[${this.adapter.providerId}] Failed to sync remote entry ${remote.mediaId}: ${extractErrorMessage(error)}`
        );
        report(remote.title, 'error');
      }
    }

    // 2. Local-only entries: create on the remote (full mirror) when they have a
    //    resolvable provider id; otherwise skip (no media id to write).
    for (const local of localOnly) {
      try {
        const pid = this.adapter.providerMediaId(local);
        if (pid == null) {
          result.skippedNoId += 1;
          report(local.title, 'skipped');
          continue;
        }
        // Guard against a remote entry that appeared after the snapshot — only
        // truly remote-absent locals reach here, but re-checking is cheap.
        if (remoteById.has(pid)) {
          continue;
        }
        // Same optimistic re-read guard as the matched branch: the row may have
        // been edited or deleted since the start-of-run snapshot, so re-read it
        // before pushing — don't mirror a stale value (or a just-deleted row) to
        // the remote. It reconciles on the next sync.
        if (!this.rowUnchanged(local)) {
          report(local.title, 'unchanged');
          continue;
        }
        await this.adapter.pushLocalOnly(local);
        result.pushedNew += 1;
        report(local.title, 'pushed');
      } catch (error) {
        result.errors += 1;
        logger.error(
          `[${this.adapter.providerId}] Failed to push local entry ${local.id}: ${extractErrorMessage(error)}`
        );
        report(local.title, 'error');
      }
    }

    this.logComplete(result);
    return result;
  }

  /**
   * One-way PUSH: write the local library onto the remote, never touching the
   * local side. Fetches the remote list once (to know which entries already
   * exist, for honest `pushedNew` vs `updatedRemote` tallies) then iterates every
   * local row:
   *
   * - no provider id          → `skippedNoId` (can't address a remote entry)
   * - `create-missing` + exists → left untouched (`unchanged`)
   * - otherwise               → `pushLocalOnly` (create or overwrite; local wins)
   *
   * Uses the same optimistic re-read guard as the two-way path before each write.
   */
  private async runPush(
    onProgress: (progress: SyncProgress) => void,
    pushMode: FullSyncPushMode
  ): Promise<SyncResult> {
    const result = emptyResult();
    const { remoteById, localEntries } = await this.snapshot();
    // Every local row is reported exactly once (pushed / updated / unchanged /
    // skipped / error), so total is the local count.
    const report = this.makeReporter(localEntries.length, onProgress);

    for (const local of localEntries) {
      try {
        const pid = this.adapter.providerMediaId(local);
        if (pid == null) {
          result.skippedNoId += 1;
          report(local.title, 'skipped');
          continue;
        }

        const exists = remoteById.has(pid);
        // create-missing deliberately never modifies an existing remote entry.
        if (pushMode === 'create-missing' && exists) {
          result.unchanged += 1;
          report(local.title, 'unchanged');
          continue;
        }

        // Optimistic re-read guard: don't mirror a row that was edited or deleted
        // since the start-of-run snapshot.
        if (!this.rowUnchanged(local)) {
          report(local.title, 'unchanged');
          continue;
        }

        await this.adapter.pushLocalOnly(local);
        if (exists) {
          result.updatedRemote += 1;
          report(local.title, 'updated');
        } else {
          result.pushedNew += 1;
          report(local.title, 'pushed');
        }
      } catch (error) {
        result.errors += 1;
        logger.error(
          `[${this.adapter.providerId}] Failed to push local entry ${local.id}: ${extractErrorMessage(error)}`
        );
        report(local.title, 'error');
      }
    }

    this.logComplete(result);
    return result;
  }

  /**
   * One-way PULL: bring the remote library into the local one, never writing to
   * the remote account. Imports remote-only entries and overwrites matched local
   * rows from the remote (remote wins, via {@link SyncProviderAdapter.applyPull}).
   * Local-only rows are intentionally left untouched — there is nothing remote to
   * pull for them.
   */
  private async runPull(onProgress: (progress: SyncProgress) => void): Promise<SyncResult> {
    const result = emptyResult();
    const { remoteUnique, localById } = await this.snapshot();
    // Only remote entries are processed; local-only rows aren't touched.
    const report = this.makeReporter(remoteUnique.length, onProgress);

    for (const remote of remoteUnique) {
      try {
        const local = localById.get(remote.mediaId);
        if (!local) {
          await this.adapter.importRemote(remote);
          result.imported += 1;
          report(remote.title, 'imported');
          continue;
        }

        // Optimistic re-read guard, identical to the two-way matched branch.
        if (!this.rowUnchanged(local)) {
          report(local.title, 'unchanged');
          continue;
        }

        const action = this.adapter.applyPull(local, remote);
        if (action === 'updated') {
          result.updatedLocal += 1;
          report(local.title, 'updated');
        } else {
          result.unchanged += 1;
          report(local.title, 'unchanged');
        }
      } catch (error) {
        result.errors += 1;
        logger.error(
          `[${this.adapter.providerId}] Failed to pull remote entry ${remote.mediaId}: ${extractErrorMessage(error)}`
        );
        report(remote.title, 'error');
      }
    }

    this.logComplete(result);
    return result;
  }

  /**
   * Start-of-run snapshot shared by every direction: the viewer's remote list
   * (deduped by provider id, most-recently-updated wins — AniList returns a media
   * per list it belongs to) and the local library projected by provider id.
   */
  private async snapshot(): Promise<{
    remoteUnique: R[];
    remoteById: Map<number, R>;
    localEntries: SyncLocalRow[];
    localById: Map<number, SyncLocalRow>;
  }> {
    const viewerId = await this.adapter.getViewerId();
    const remoteEntries = await this.adapter.getRemoteEntries(viewerId);
    const localEntries = this.library.getEntriesForSync();

    const remoteById = new Map<number, R>();
    for (const entry of remoteEntries) {
      const existing = remoteById.get(entry.mediaId);
      if (!existing || entry.updatedAt > existing.updatedAt) {
        remoteById.set(entry.mediaId, entry);
      }
    }

    const localById = new Map<number, SyncLocalRow>();
    for (const row of localEntries) {
      const pid = this.adapter.providerMediaId(row);
      if (pid != null) localById.set(pid, row);
    }

    return { remoteUnique: [...remoteById.values()], remoteById, localEntries, localById };
  }

  /** Build a 1-based per-entry progress reporter bound to a fixed total. */
  private makeReporter(
    total: number,
    onProgress: (progress: SyncProgress) => void
  ): (title: string, action: SyncAction) => void {
    let current = 0;
    return (title, action) => {
      current += 1;
      onProgress({ current, total, title, action });
    };
  }

  /** Log the final tally line, identical across all directions. */
  private logComplete(result: SyncResult): void {
    logger.info(
      `[${this.adapter.providerId}] sync complete: imported=${result.imported} pushedNew=${result.pushedNew} ` +
        `updatedLocal=${result.updatedLocal} updatedRemote=${result.updatedRemote} ` +
        `unchanged=${result.unchanged} conflicts=${result.conflicts} ` +
        `skippedNoId=${result.skippedNoId} errors=${result.errors}`
    );
  }

  /**
   * Sync a SINGLE library entry, with a forced direction or auto-merge. The caller
   * owns the single-flight guard and the connected-account check; this resolves the
   * row, applies the optimistic re-read guard (inside the adapter's apply* / via the
   * push path), and dispatches to the adapter.
   *
   * Returns the per-entry outcome. The caller maps `SYNC_ENTRY_NOT_FOUND` etc.
   */
  async runEntrySync(
    localId: number,
    direction: 'push' | 'pull' | 'auto'
  ): Promise<{ action: SyncEntryAction; notFound?: boolean }> {
    const local = this.library.getSyncRowById(localId);
    if (!local) {
      return { action: 'skipped', notFound: true };
    }

    // A local-only entry with no provider id has no media id to write/read.
    if (this.adapter.providerMediaId(local) == null) {
      return { action: 'skipped' };
    }

    // Forced push never needs a remote read: mirror the local row onto the remote.
    if (direction === 'push') {
      return { action: await this.pushLocalGuarded(local) };
    }

    // pull / auto both need the current remote entry.
    const viewerId = await this.adapter.getViewerId();
    const remote = await this.adapter.getRemoteEntry(
      this.adapter.providerMediaId(local) as number,
      viewerId
    );

    if (direction === 'pull') {
      if (!remote) {
        return { action: 'skipped' };
      }
      return { action: this.applyPullGuarded(local, remote) };
    }

    // direction === 'auto'
    if (!remote) {
      // No remote match → behave like the full sync's local-only push branch.
      return { action: await this.pushLocalGuarded(local) };
    }
    // Apply the optimistic re-read guard up front, exactly like pull/push, so the
    // adapter's merge never runs against a row that changed/vanished mid-sync.
    if (!this.rowUnchanged(local)) {
      return { action: 'unchanged' };
    }
    return { action: await this.adapter.applyAuto(local, remote) };
  }

  /**
   * Push a local row through the adapter with the optimistic re-read guard applied
   * up front (mirrors the full sync's local-only branch + the original
   * `pushLocal`'s guard).
   */
  private async pushLocalGuarded(local: SyncLocalRow): Promise<SyncEntryAction> {
    if (!this.rowUnchanged(local)) {
      return 'unchanged';
    }
    await this.adapter.pushLocalOnly(local);
    return 'pushed';
  }

  private applyPullGuarded(local: SyncLocalRow, remote: R): SyncEntryAction {
    if (!this.rowUnchanged(local)) {
      return 'unchanged';
    }
    return this.adapter.applyPull(local, remote);
  }

  /**
   * Re-read a row right before writing and confirm it's unchanged since the
   * snapshot. False when the row changed or was deleted mid-sync (optimistic
   * concurrency guard, identical to the full sync).
   */
  private rowUnchanged(snapshot: { id: number; updatedAt: string }): boolean {
    const current = this.library.getEntryById(snapshot.id);
    return !!current && current.updatedAt === snapshot.updatedAt;
  }
}
