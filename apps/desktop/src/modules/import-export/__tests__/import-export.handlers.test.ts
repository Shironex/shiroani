import { CrudActions, DiaryEvents, ImportExportEvents, LibraryEvents } from '@shiroani/shared';
import { createImportExportHandlers } from '../import-export.handlers';

const STAMP = '2026-11-01T00:00:00.000Z';
const ENVELOPE = { version: 1, exportedAt: STAMP, source: 'shiroani', data: {} };
const RESPONSE = { results: [], totalImported: 1, totalSkipped: 0, totalErrors: 0 };
const IMPORT_REQUEST = { type: 'all', data: ENVELOPE, strategy: 'skip' };

function build(flags: { hasLibrary: boolean; hasDiary: boolean }) {
  const importExport = {
    exportData: jest.fn(() => ({ ...ENVELOPE, data: { library: [{}, {}], diary: [{}] } })),
    importBatch: jest.fn(async (_req: unknown, onProgress: (r: unknown) => void) => {
      onProgress({ index: 0, title: 'a', status: 'success' });
      return { response: RESPONSE, ...flags };
    }),
    clearAllData: jest.fn(),
  };
  const emit = jest.fn();
  const handlers = createImportExportHandlers(importExport as never, { emit });
  return { importExport, emit, handlers };
}

describe('import-export handlers', () => {
  it('exports with a total across both domains', async () => {
    const { handlers, importExport } = build({ hasLibrary: false, hasDiary: false });

    const result = await handlers[ImportExportEvents.EXPORT]({ type: 'all', ids: [1] });

    expect(importExport.exportData).toHaveBeenCalledWith('all', [1]);
    expect(result.totalExported).toBe(3);
  });

  it('publishes progress, then refreshes the domains that were imported', async () => {
    const { handlers, emit } = build({ hasLibrary: true, hasDiary: true });

    await expect(handlers[ImportExportEvents.IMPORT](IMPORT_REQUEST)).resolves.toEqual(RESPONSE);

    expect(emit.mock.calls).toEqual([
      [ImportExportEvents.IMPORT_PROGRESS, { index: 0, title: 'a', status: 'success' }],
      [LibraryEvents.UPDATED, { action: CrudActions.IMPORTED }],
      [DiaryEvents.UPDATED, { action: CrudActions.IMPORTED }],
    ]);
  });

  it('does not refresh a domain that was not imported', async () => {
    const { handlers, emit } = build({ hasLibrary: false, hasDiary: true });

    await handlers[ImportExportEvents.IMPORT](IMPORT_REQUEST);

    expect(emit).not.toHaveBeenCalledWith(LibraryEvents.UPDATED, expect.anything());
    expect(emit).toHaveBeenCalledWith(DiaryEvents.UPDATED, { action: CrudActions.IMPORTED });
  });

  it('never reaches the service with an invalid request', async () => {
    const { handlers, importExport, emit } = build({ hasLibrary: true, hasDiary: true });

    const result = await handlers[ImportExportEvents.IMPORT]({ type: 'all', strategy: 'skip' });

    expect(result.totalImported).toBe(0);
    expect(typeof result.error).toBe('string');
    expect(importExport.importBatch).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('clears without broadcasting, because the renderer relaunches', async () => {
    const { handlers, importExport, emit } = build({ hasLibrary: false, hasDiary: false });

    await expect(handlers[ImportExportEvents.CLEAR_ALL](undefined)).resolves.toEqual({
      success: true,
    });

    expect(importExport.clearAllData).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it('resolves success false when the wipe fails, which aborts the reset', async () => {
    const { handlers, importExport } = build({ hasLibrary: false, hasDiary: false });
    importExport.clearAllData.mockImplementation(() => {
      throw new Error('locked');
    });

    await expect(handlers[ImportExportEvents.CLEAR_ALL](undefined)).resolves.toEqual({
      success: false,
      error: 'locked',
    });
  });

  it('accepts a roughly 20 MB request through the schema', async () => {
    const { handlers, importExport } = build({ hasLibrary: true, hasDiary: false });
    const rows = Array.from({ length: 45_000 }, (_, i) => ({
      title: `Row ${i}`,
      status: 'watching',
      episodes: 12,
      currentEpisode: 0,
      notes: 'x'.repeat(420),
      addedAt: STAMP,
      updatedAt: STAMP,
    }));
    const data = { ...ENVELOPE, data: { library: rows } };

    const result = await handlers[ImportExportEvents.IMPORT]({
      type: 'library',
      data,
      strategy: 'skip',
    });

    expect(JSON.stringify(data).length).toBeGreaterThan(20_000_000);
    expect(result.error).toBeUndefined();
    expect(importExport.importBatch).toHaveBeenCalledTimes(1);
  });
});
