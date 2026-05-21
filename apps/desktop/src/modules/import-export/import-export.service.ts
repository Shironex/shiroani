import { Injectable } from '@nestjs/common';
import {
  createLogger,
  type AnimeEntry,
  type DiaryEntry,
  type ShiroaniExportFormat,
  type ImportItemResult,
  type ImportRequest,
  type ImportResponse,
} from '@shiroani/shared';
import { LibraryService } from '../library';
import { DiaryService } from '../diary';

const logger = createLogger('ImportExportService');

/** Artificial per-item delay so the renderer can render import progress incrementally. */
const IMPORT_PROGRESS_THROTTLE_MS = 1000;

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
    private readonly diaryService: DiaryService
  ) {
    logger.info('ImportExportService initialized');
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

  /** Import a single library entry with duplicate detection. */
  importLibraryEntry(
    entry: Omit<AnimeEntry, 'id'>,
    strategy: 'skip' | 'overwrite'
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      const allEntries = this.libraryService.getAllEntries();
      const duplicate = allEntries.find(
        existing =>
          (entry.anilistId !== undefined && existing.anilistId === entry.anilistId) ||
          existing.title === entry.title ||
          (entry.resumeUrl !== undefined &&
            entry.resumeUrl !== '' &&
            existing.resumeUrl === entry.resumeUrl)
      );

      if (duplicate) {
        if (strategy === 'skip') {
          return { ...baseResult, status: 'skipped' };
        }

        // Overwrite: update the existing entry
        this.libraryService.updateEntry(duplicate.id, {
          anilistId: entry.anilistId ?? null,
          status: entry.status,
          currentEpisode: entry.currentEpisode,
          score: entry.score,
          notes: entry.notes,
          resumeUrl: entry.resumeUrl,
        });
        return { ...baseResult, status: 'success' };
      }

      // No duplicate — add new entry
      this.libraryService.addEntry({
        anilistId: entry.anilistId,
        title: entry.title,
        titleRomaji: entry.titleRomaji,
        titleNative: entry.titleNative,
        coverImage: entry.coverImage,
        episodes: entry.episodes,
        status: entry.status,
        currentEpisode: entry.currentEpisode,
        resumeUrl: entry.resumeUrl,
      });
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error importing library entry "${entry.title}":`, error);
      return { ...baseResult, status: 'error', error: message };
    }
  }

  /** Import a single diary entry with duplicate detection. */
  importDiaryEntry(
    entry: Omit<DiaryEntry, 'id' | 'animeId'>,
    strategy: 'skip' | 'overwrite'
  ): ImportItemResult {
    const baseResult: ImportItemResult = {
      index: 0,
      title: entry.title,
      status: 'processing',
    };

    try {
      const allEntries = this.diaryService.getAllEntries();
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
      this.diaryService.createEntry({
        title: entry.title,
        contentJson: entry.contentJson,
        coverGradient: entry.coverGradient,
        mood: entry.mood,
        tags: entry.tags,
        animeTitle: entry.animeTitle,
        animeCoverImage: entry.animeCoverImage,
      });
      return { ...baseResult, status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
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
      for (const entry of libraryEntries) {
        tally(this.importLibraryEntry(entry, request.strategy));
        await sleep(IMPORT_PROGRESS_THROTTLE_MS);
      }
    }

    const diaryEntries = request.data.data.diary ?? [];
    const hasDiary =
      (request.type === 'diary' || request.type === 'all') && diaryEntries.length > 0;
    if (hasDiary) {
      for (const entry of diaryEntries) {
        tally(this.importDiaryEntry(entry, request.strategy));
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
