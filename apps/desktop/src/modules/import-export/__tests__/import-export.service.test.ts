import { ImportExportService } from '../import-export.service';
import type { LibraryService } from '../../library';
import type { DiaryService } from '../../diary';
import type { DatabaseService } from '../../database';
import type { AnimeEntry } from '@shiroani/shared';

/**
 * Unit tests for the library import path — duplicate matching and field
 * forwarding. LibraryService is stubbed (the real one needs better-sqlite3,
 * which cannot load under jest's Node ABI); these tests pin the import
 * CONTRACT: what reaches addEntry/updateEntry/setMalId for a given payload.
 */

function entry(o: Partial<AnimeEntry> = {}): Omit<AnimeEntry, 'id'> {
  return {
    anilistId: undefined,
    malId: null,
    title: 'Some Show',
    status: 'watching',
    currentEpisode: 3,
    addedAt: '2024-01-01 00:00:00',
    updatedAt: '2024-01-01 00:00:00',
    ...o,
  } as Omit<AnimeEntry, 'id'>;
}

function existing(o: Partial<AnimeEntry> = {}): AnimeEntry {
  return {
    id: 1,
    anilistId: null,
    malId: null,
    title: 'Some Show',
    status: 'watching',
    currentEpisode: 1,
    addedAt: '2023-01-01 00:00:00',
    updatedAt: '2023-01-01 00:00:00',
    ...o,
  } as AnimeEntry;
}

function makeService(rows: AnimeEntry[]) {
  const library = {
    getAllEntries: jest.fn(() => rows),
    addEntry: jest.fn((payload: unknown) => ({ id: 99, ...(payload as object) })),
    updateEntry: jest.fn((id: number, _updates: Record<string, unknown>) =>
      rows.find(r => r.id === id)
    ),
    setMalId: jest.fn(),
  };
  const diary = { getAllEntries: jest.fn(() => []) };
  const db = {};
  const service = new ImportExportService(
    library as unknown as LibraryService,
    diary as unknown as DiaryService,
    db as unknown as DatabaseService
  );
  return { service, library };
}

describe('importLibraryEntry — malId round-trip', () => {
  it('forwards malId to addEntry on a fresh import', () => {
    const { service, library } = makeService([]);
    const result = service.importLibraryEntry(entry({ malId: 5114 }), 'skip');
    expect(result.status).toBe('success');
    expect(library.addEntry).toHaveBeenCalledWith(expect.objectContaining({ malId: 5114 }));
  });

  it('matches a duplicate by malId and skips under the skip strategy', () => {
    const { service, library } = makeService([
      existing({ id: 7, title: 'Different Display Title', malId: 5114 }),
    ]);
    const result = service.importLibraryEntry(entry({ title: 'Some Show', malId: 5114 }), 'skip');
    expect(result.status).toBe('skipped');
    expect(library.addEntry).not.toHaveBeenCalled();
  });

  it('links malId onto an unlinked duplicate under the overwrite strategy', () => {
    const { service, library } = makeService([
      existing({ id: 7, anilistId: 21, title: 'Some Show', malId: null }),
    ]);
    const result = service.importLibraryEntry(
      entry({ title: 'Some Show', anilistId: 21, malId: 5114 }),
      'overwrite'
    );
    expect(result.status).toBe('success');
    expect(library.setMalId).toHaveBeenCalledWith(7, 5114);
  });
});

describe('importLibraryEntry — overwrite must not unlink provider ids', () => {
  it('does not write anilistId when the import entry lacks one', () => {
    const { service, library } = makeService([
      existing({ id: 7, anilistId: 21, title: 'Some Show' }),
    ]);
    const result = service.importLibraryEntry(
      entry({ title: 'Some Show', anilistId: undefined }),
      'overwrite'
    );
    expect(result.status).toBe('success');
    const updates = library.updateEntry.mock.calls[0][1] as Record<string, unknown>;
    expect('anilistId' in updates).toBe(false);
  });

  it('still writes anilistId when the import entry carries one', () => {
    const { service, library } = makeService([
      existing({ id: 7, anilistId: 21, title: 'Some Show' }),
    ]);
    service.importLibraryEntry(entry({ title: 'Some Show', anilistId: 21 }), 'overwrite');
    const updates = library.updateEntry.mock.calls[0][1] as Record<string, unknown>;
    expect(updates.anilistId).toBe(21);
  });
});

describe('importLibraryEntry — title dedup safety', () => {
  it('treats same-title rows with DIFFERENT anilistIds as distinct shows', () => {
    const { service, library } = makeService([
      existing({ id: 7, anilistId: 21, title: 'Shared Title' }),
    ]);
    const result = service.importLibraryEntry(
      entry({ title: 'Shared Title', anilistId: 99999 }),
      'overwrite'
    );
    expect(result.status).toBe('success');
    expect(library.updateEntry).not.toHaveBeenCalled();
    expect(library.addEntry).toHaveBeenCalled();
  });

  it('still matches by exact title when neither side carries an id', () => {
    const { service, library } = makeService([existing({ id: 7, title: 'Shared Title' })]);
    const result = service.importLibraryEntry(entry({ title: 'Shared Title' }), 'skip');
    expect(result.status).toBe('skipped');
    expect(library.addEntry).not.toHaveBeenCalled();
  });
});

describe('importLibraryEntry — shared batch snapshot', () => {
  it('dedupes intra-batch duplicates against the shared snapshot without re-reading the table', () => {
    const { service, library } = makeService([]);
    const snapshot: AnimeEntry[] = [];
    const first = service.importLibraryEntry(entry({ title: 'Twice' }), 'skip', snapshot);
    const second = service.importLibraryEntry(entry({ title: 'Twice' }), 'skip', snapshot);
    expect(first.status).toBe('success');
    expect(second.status).toBe('skipped');
    expect(library.addEntry).toHaveBeenCalledTimes(1);
    expect(library.getAllEntries).not.toHaveBeenCalled();
  });
});
