import { Injectable } from '@nestjs/common';
import {
  createLogger,
  extractErrorMessage,
  type AnimeEntry,
  type DiaryEntry,
  type ShiroaniExportFormat,
  type ImportItemResult,
  type ImportRequest,
  type ImportResponse,
} from '@shiroani/shared';
import { LibraryService } from '../library';
import { DiaryService } from '../diary';
import { DatabaseService } from '../database';

const logger = createLogger('ImportExportService');

/**
 * Artificial per-item delay so the renderer can render import progress
 * incrementally. Kept small — at 1000ms a 600-entry import took ~10 minutes,
 * virtually all of it sleep; 25ms still lets the progress list animate.
 */
const IMPORT_PROGRESS_THROTTLE_MS = 25;

/** Small helper to wait for a given number of milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Reported by {@link ImportExportService.importBatch} so the caller can refresh the right stores. */
export interface ImportBatchResult {
  response: ImportResponse;
  hasLibrary: boolean;
  hasDiary: boolean;
}

@Injectable()
export class ImportExportService {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly diaryService: DiaryService,
    private readonly databaseService: DatabaseService
  ) {
    logger.info('ImportExportService initialized');
  }

  /**
   * Factory reset: erase every user table (library, diary, feed, bookmarks,
   * watch history, …). Delegates to {@link DatabaseService.clearAllData}, which
   * owns the wipe — this method lives in the `data:` domain so the gateway has a
   * single service to call alongside export/import. (Minor: the service is
   * named for import/export but also fronts the full-data wipe.)
   */
  clearAllData(): void {
    this.databaseService.clearAllData();
    logger.info('All user data cleared');
  }

  /** Export library and/or diary entries into the ShiroaniExportFormat. */
  exportData(type: 'library' | 'diary' | 'all', ids?: number[]): ShiroaniExportFormat {
    const result: ShiroaniExportFormat = {
      version: 1,
      exportedAt: new Date().toISOString(),
      source: 'shiroani',
      data: {},
    };

    if (type === 'library' || type === 'all') {
      let entries = this.libraryService.getAllEntries();
      if (ids && type === 'library') {
        entries = entries.filter(e => ids.includes(e.id));
      }
      result.data.library = entries.map(({ id: _id, ...rest }) => rest);
    }

    if (type === 'diary' || type === 'all') {
      let entries = this.diaryService.getAllEntries();
      if (ids && type === 'diary') {
        entries = entries.filter(e => ids.includes(e.id));
      }
      result.data.diary = entries.map(({ id: _id, animeId: _animeId, ...rest }) => rest);
    }

    const libraryCount = result.data.library?.length ?? 0;
    const diaryCount = result.data.diary?.length ?? 0;
    logger.info(`Exported ${libraryCount} library + ${diaryCount} diary entries`);

    return result;
  }

  /**
   * Import a single library entry with duplicate detection.
   *
   * `allEntries` lets {@link importBatch} share ONE library snapshot across the
   * whole run instead of re-reading the full table per item (O(N×M) row
   * materializations on large imports). The snapshot is kept current in place:
   * fresh adds are pushed, overwrites mutate the matched element — so
   * intra-file duplicates still dedupe against each other.
   */
  importLibraryEntry(
    entry: Omit<AnimeEntry, 'id'>,
    strategy: 'skip' | 'overwrite',
    allEntries?: AnimeEntry[]
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      allEntries ??= this.libraryService.getAllEntries();
      // Match on a provider id (both DB-unique) first, then exact title.
      // `resumeUrl` was intentionally dropped: two different shows on the same
      // player/landing site share a URL, so keying on it merged distinct
      // entries (and with the overwrite strategy, clobbered one with the other).
      // A title match is rejected when both sides carry DIFFERENT AniList ids —
      // seasons/remakes often share a display title and must stay distinct.
      const duplicate = allEntries.find(existing => {
        if (entry.anilistId !== undefined && existing.anilistId === entry.anilistId) return true;
        if (entry.malId != null && existing.malId === entry.malId) return true;
        if (existing.title !== entry.title) return false;
        return !(
          entry.anilistId !== undefined &&
          existing.anilistId != null &&
          existing.anilistId !== entry.anilistId
        );
      });

      if (duplicate) {
        if (strategy === 'skip') {
          return { ...baseResult, status: 'skipped' };
        }

        // Overwrite: update the existing entry. `anilistId` is written ONLY
        // when the import carries one — coercing an absent id to null would
        // silently unlink an AniList-connected row and drop it from sync.
        this.libraryService.updateEntry(duplicate.id, {
          ...(entry.anilistId !== undefined && { anilistId: entry.anilistId }),
          status: entry.status,
          currentEpisode: entry.currentEpisode,
          score: entry.score,
          notes: entry.notes,
          resumeUrl: entry.resumeUrl,
        });
        if (entry.anilistId !== undefined) duplicate.anilistId = entry.anilistId;
        // Link the MAL id when the import carries one and the row is unlinked.
        // setMalId rethrows on a UNIQUE collision (another row owns the id) —
        // skip-and-continue, mirroring the sync adapters.
        if (entry.malId != null && duplicate.malId == null) {
          try {
            this.libraryService.setMalId(duplicate.id, entry.malId);
            duplicate.malId = entry.malId;
          } catch (error) {
            const message = extractErrorMessage(error);
            // Only a UNIQUE collision means the id is already linked elsewhere —
            // mirror mal-sync.adapter.ts and log other failures at error level.
            if (/unique/i.test(message)) {
              logger.warn(
                `Import: mal_id ${entry.malId} already linked to another row; left "${entry.title}" unlinked`
              );
            } else {
              logger.error(
                `Import: failed to link mal_id ${entry.malId} for "${entry.title}": ${message}`
              );
            }
          }
        }
        return { ...baseResult, status: 'success' };
      }

      // No duplicate — add new entry. `score`/`notes`/`malId` are carried on
      // insert (addEntry persists them) so a fresh import keeps the rating,
      // notes and MAL link instead of silently dropping them.
      const created = this.libraryService.addEntry({
        anilistId: entry.anilistId,
        malId: entry.malId,
        title: entry.title,
        titleRomaji: entry.titleRomaji,
        titleNative: entry.titleNative,
        coverImage: entry.coverImage,
        episodes: entry.episodes,
        status: entry.status,
        currentEpisode: entry.currentEpisode,
        score: entry.score,
        notes: entry.notes,
        resumeUrl: entry.resumeUrl,
      });
      allEntries.push(created);
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = extractErrorMessage(error, 'Unknown error');
      logger.error(`Error importing library entry "${entry.title}":`, error);
      return { ...baseResult, status: 'error', error: message };
    }
  }

  /**
   * Import a single diary entry with duplicate detection. `allEntries` shares
   * one snapshot across a batch run (see {@link importLibraryEntry}).
   */
  importDiaryEntry(
    entry: Omit<DiaryEntry, 'id' | 'animeId'>,
    strategy: 'skip' | 'overwrite',
    allEntries?: DiaryEntry[]
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      allEntries ??= this.diaryService.getAllEntries();
      const duplicate = allEntries.find(
        existing => existing.title === entry.title && existing.createdAt === entry.createdAt
      );

      if (duplicate) {
        if (strategy === 'skip') {
          return { ...baseResult, status: 'skipped' };
        }

        // Overwrite: update the existing entry
        this.diaryService.updateEntry(duplicate.id, {
          title: entry.title,
          contentJson: entry.contentJson,
          coverGradient: entry.coverGradient ?? null,
          mood: entry.mood ?? null,
          tags: entry.tags ?? null,
          animeTitle: entry.animeTitle ?? null,
          animeCoverImage: entry.animeCoverImage ?? null,
          isPinned: entry.isPinned,
        });
        return { ...baseResult, status: 'success' };
      }

      // No duplicate — create new entry
      const created = this.diaryService.createEntry({
        title: entry.title,
        contentJson: entry.contentJson,
        coverGradient: entry.coverGradient,
        mood: entry.mood,
        tags: entry.tags,
        animeTitle: entry.animeTitle,
        animeCoverImage: entry.animeCoverImage,
      });
      allEntries.push(created);
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = extractErrorMessage(error, 'Unknown error');
      logger.error(`Error importing diary entry "${entry.title}":`, error);
      return { ...baseResult, status: 'error', error: message };
    }
  }

  /**
   * Run a full import batch: import the requested library and/or diary entries
   * (throttled per item), tally the outcome, and report progress as each entry
   * completes. Transport-agnostic — the caller decides how `onProgress` and the
   * returned `hasLibrary`/`hasDiary` flags surface to clients.
   */
  async importBatch(
    request: ImportRequest,
    onProgress: (result: ImportItemResult) => void
  ): Promise<ImportBatchResult> {
    const results: ImportItemResult[] = [];
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let index = 0;

    const tally = (result: ImportItemResult): void => {
      result.index = index;
      results.push(result);
      onProgress(result);

      if (result.status === 'success') totalImported++;
      else if (result.status === 'skipped') totalSkipped++;
      else if (result.status === 'error') totalErrors++;

      index++;
    };

    const libraryEntries = request.data.data.library ?? [];
    const hasLibrary =
      (request.type === 'library' || request.type === 'all') && libraryEntries.length > 0;
    if (hasLibrary) {
      // One snapshot for the whole run — per-item getAllEntries() was O(N×M).
      const librarySnapshot = this.libraryService.getAllEntries();
      for (const entry of libraryEntries) {
        tally(this.importLibraryEntry(entry, request.strategy, librarySnapshot));
        await sleep(IMPORT_PROGRESS_THROTTLE_MS);
      }
    }

    const diaryEntries = request.data.data.diary ?? [];
    const hasDiary =
      (request.type === 'diary' || request.type === 'all') && diaryEntries.length > 0;
    if (hasDiary) {
      const diarySnapshot = this.diaryService.getAllEntries();
      for (const entry of diaryEntries) {
        tally(this.importDiaryEntry(entry, request.strategy, diarySnapshot));
        await sleep(IMPORT_PROGRESS_THROTTLE_MS);
      }
    }

    const response: ImportResponse = {
      results,
      totalImported,
      totalSkipped,
      totalErrors,
    };

    logger.info(
      `Import complete: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`
    );

    return { response, hasLibrary, hasDiary };
  }
}
