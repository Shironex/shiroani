import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import type { ShiroaniExportFormat, ImportItemResult, ImportResponse } from '@shiroani/shared';

// Control both the socket transport and the (off-fork) socket listener so the
// dialog's state machine can be driven deterministically through its branches.
const emitWithErrorHandling = vi.fn();
const socketOn = vi.fn();
const socketOff = vi.fn();
let progressHandler: ((p: ImportItemResult) => void) | undefined;

vi.mock('@/lib/socket', () => ({
  emitWithErrorHandling: (...args: unknown[]) => emitWithErrorHandling(...args),
  getSocket: () => ({
    on: (event: string, handler: (p: ImportItemResult) => void) => {
      socketOn(event, handler);
      progressHandler = handler;
    },
    off: (event: string, handler: unknown) => socketOff(event, handler),
  }),
}));

import { ImportDialog } from '@/components/shared/ImportDialog';

const VALID_EXPORT: ShiroaniExportFormat = {
  version: 1,
  exportedAt: '2026-06-15T00:00:00.000Z',
  source: 'shiroani',
  data: {
    library: [{ title: 'Frieren' } as never, { title: 'Bocchi' } as never],
    diary: [{ title: 'Day 1' } as never],
  },
};

const IMPORT_RESULT: ImportResponse = {
  results: [],
  totalImported: 2,
  totalSkipped: 1,
  totalErrors: 0,
};

/** Stubs the Electron bridge so file selection reaches the preview step. */
function stubFileBridge(raw: string | null = JSON.stringify(VALID_EXPORT)) {
  const openFile = vi.fn().mockResolvedValue('/tmp/in.json');
  const readJson = vi.fn().mockResolvedValue(raw);
  vi.stubGlobal('electronAPI', { dialog: { openFile }, file: { readJson } });
  return { openFile, readJson };
}

describe('ImportDialog', () => {
  beforeEach(() => {
    emitWithErrorHandling.mockReset();
    socketOn.mockReset();
    socketOff.mockReset();
    progressHandler = undefined;
    // Default: the import emit never resolves, parking the dialog on importing.
    emitWithErrorHandling.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the dialog title and description when open', () => {
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);
    expect(screen.getByText('Import data')).toBeInTheDocument();
    expect(screen.getByText('Load data from a JSON file.')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ImportDialog open={false} onOpenChange={() => {}} type="all" />);
    expect(screen.queryByText('Import data')).not.toBeInTheDocument();
  });

  it('closes the dialog when the native file picker is cancelled (no path)', async () => {
    const openFile = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('electronAPI', { dialog: { openFile }, file: { readJson: vi.fn() } });
    const onOpenChange = vi.fn();

    render(<ImportDialog open onOpenChange={onOpenChange} type="all" />);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('shows the preview with library/diary counts and a strategy choice', async () => {
    stubFileBridge();
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    // "Found 2 anime and 1 diary entries" — counts come from the parsed file.
    expect(await screen.findByText(/found/i)).toBeInTheDocument();
    expect(screen.getByText('What to do with duplicates?')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    // Skip is the default strategy.
    expect(screen.getByRole('radio', { checked: true })).toBe(radios[0]);
  });

  it('lets the user switch the duplicate strategy to overwrite', async () => {
    stubFileBridge();
    const { user } = render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    await screen.findByText(/found/i);
    const overwrite = screen.getByRole('radio', { name: /overwrite/i });
    await user.click(overwrite);
    expect(overwrite).toBeChecked();
  });

  it('shows a file error for a non-ShiroAni export file and offers a close button', async () => {
    stubFileBridge(JSON.stringify({ source: 'somethingelse', version: 1, data: {} }));
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    expect(await screen.findByText('This is not a ShiroAni export file.')).toBeInTheDocument();
    expect(screen.getByText('Close', { selector: 'button' })).toBeInTheDocument();
  });

  it('shows an invalid-JSON error when the file is not parseable', async () => {
    stubFileBridge('{ not json');
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    expect(await screen.findByText('This is not a valid JSON file')).toBeInTheDocument();
  });

  it('shows a read error when the file content is empty', async () => {
    stubFileBridge(null);
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    expect(await screen.findByText('Failed to read the file')).toBeInTheDocument();
  });

  it('emits the import request with the selected strategy when Import is clicked', async () => {
    stubFileBridge();
    const { user } = render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    await screen.findByText(/found/i);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(emitWithErrorHandling).toHaveBeenCalledTimes(1);
    const [, payload] = emitWithErrorHandling.mock.calls[0];
    expect(payload).toMatchObject({ type: 'all', strategy: 'skip' });
    // The importing panel shows while the request is in flight.
    expect(await screen.findByText('Importing data...')).toBeInTheDocument();
  });

  it('updates progress as the socket emits item updates', async () => {
    stubFileBridge();
    const { user } = render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    await screen.findByText(/found/i);
    await user.click(screen.getByRole('button', { name: /^import$/i }));
    await screen.findByText('Importing data...');

    // 3 items total → completing 1 success drives the percentage to 33%.
    progressHandler?.({ index: 0, title: 'Frieren', status: 'success' });
    expect(await screen.findByText('33%')).toBeInTheDocument();
  });

  it('shows the done summary with imported/skipped counts when the import resolves', async () => {
    emitWithErrorHandling.mockResolvedValueOnce(IMPORT_RESULT);
    stubFileBridge();
    const { user } = render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    await screen.findByText(/found/i);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    // Done transition has an 800ms settle delay before showing the summary.
    expect(await screen.findByText('Import finished', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Imported: 2')).toBeInTheDocument();
    expect(screen.getByText('Skipped: 1')).toBeInTheDocument();
  });

  it('surfaces an import failure as a file error', async () => {
    emitWithErrorHandling.mockRejectedValueOnce(new Error('Server exploded'));
    stubFileBridge();
    const { user } = render(<ImportDialog open onOpenChange={() => {}} type="all" />);

    await screen.findByText(/found/i);
    await user.click(screen.getByRole('button', { name: /^import$/i }));

    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });
});
