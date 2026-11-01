import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import type { ExportResponse } from '@shiroani/shared';

// The export flow emits over IPC; control the transport so we can drive
// the dialog's state machine through its meaningful branches deterministically.
const invokeBackend = vi.fn();
vi.mock('@/lib/backend', () => ({
  invokeBackend: (...args: unknown[]) => invokeBackend(...args),
}));

import { ExportDialog } from '@/components/shared/ExportDialog';

const EXPORT_RESPONSE: ExportResponse = {
  totalExported: 7,
  data: {
    version: 1,
    exportedAt: '2026-06-15T00:00:00.000Z',
    source: 'shiroani',
    data: { library: [], diary: [] },
  },
};

/** Resolves the auto-triggered export so the dialog lands on the success step. */
function resolveExport(response: ExportResponse = EXPORT_RESPONSE) {
  invokeBackend.mockResolvedValueOnce(response);
}

describe('ExportDialog', () => {
  beforeEach(() => {
    invokeBackend.mockReset();
    // A never-resolving export keeps the dialog on its loading step by default.
    invokeBackend.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the dialog title and description when open', () => {
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);
    expect(screen.getByText('Export data')).toBeInTheDocument();
    expect(screen.getByText('Save data to a JSON file.')).toBeInTheDocument();
  });

  it('warns when the file would be too big to import back', async () => {
    const notes = 'x'.repeat(100 * 1024 * 1024 + 1);
    resolveExport({
      ...EXPORT_RESPONSE,
      data: { ...EXPORT_RESPONSE.data, data: { library: [{ notes } as never], diary: [] } },
    });
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This export is over 100 MB, so the app will not be able to import it back.'
    );
    // Still offers the save: a big backup beats no backup.
    expect(screen.getByRole('button', { name: /save as/i })).toBeInTheDocument();
  });

  it('does not warn for a file that can be imported back', async () => {
    resolveExport();
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    await screen.findByRole('button', { name: /save as/i });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ExportDialog open={false} onOpenChange={() => {}} type="library" />);
    expect(screen.queryByText('Export data')).not.toBeInTheDocument();
  });

  it('auto-triggers the export with the given type and selected ids on open', () => {
    render(<ExportDialog open onOpenChange={() => {}} type="diary" selectedIds={[1, 2, 3]} />);
    expect(invokeBackend).toHaveBeenCalledTimes(1);
    expect(invokeBackend).toHaveBeenCalledWith(expect.any(String), {
      type: 'diary',
      ids: [1, 2, 3],
    });
  });

  it('shows the preparing state while the export is in flight', () => {
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);
    expect(screen.getByText('Preparing data...')).toBeInTheDocument();
  });

  it('shows the exported count and a save button once the export resolves', async () => {
    resolveExport();
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save as/i })).toBeInTheDocument();
  });

  it('shows the error message when the export rejects', async () => {
    invokeBackend.mockRejectedValueOnce(new Error('Backend boom'));
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    expect(await screen.findByText('Backend boom')).toBeInTheDocument();
    // Error state offers a footer close button (its label is a real text node,
    // distinct from the dialog's icon-only "X" close whose label is sr-only).
    expect(screen.getByText('Close', { selector: 'button' })).toBeInTheDocument();
  });

  it('writes the file when Save as is clicked and a path is chosen, then shows saved', async () => {
    const saveFile = vi.fn().mockResolvedValue('/tmp/out.json');
    const writeJson = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('electronAPI', { dialog: { saveFile }, file: { writeJson } });

    resolveExport();
    const { user } = render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    await user.click(await screen.findByRole('button', { name: /save as/i }));

    await waitFor(() => expect(writeJson).toHaveBeenCalledTimes(1));
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('File saved')).toBeInTheDocument();
  });

  it('returns to the success state when the save dialog is cancelled (no path)', async () => {
    const saveFile = vi.fn().mockResolvedValue(undefined);
    const writeJson = vi.fn();
    vi.stubGlobal('electronAPI', { dialog: { saveFile }, file: { writeJson } });

    resolveExport();
    const { user } = render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    await user.click(await screen.findByRole('button', { name: /save as/i }));

    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    expect(writeJson).not.toHaveBeenCalled();
    // Still on the success step: save button is back.
    expect(await screen.findByRole('button', { name: /save as/i })).toBeInTheDocument();
  });

  it('shows a save error when writing the file fails', async () => {
    const saveFile = vi.fn().mockResolvedValue('/tmp/out.json');
    const writeJson = vi.fn().mockRejectedValue(new Error('Disk full'));
    vi.stubGlobal('electronAPI', { dialog: { saveFile }, file: { writeJson } });

    resolveExport();
    const { user } = render(<ExportDialog open onOpenChange={() => {}} type="library" />);

    await user.click(await screen.findByRole('button', { name: /save as/i }));

    expect(await screen.findByText('Disk full')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when the close button is clicked in the error state', async () => {
    invokeBackend.mockRejectedValueOnce(new Error('nope'));
    const onOpenChange = vi.fn();
    const { user } = render(<ExportDialog open onOpenChange={onOpenChange} type="library" />);

    await user.click(await screen.findByText('Close', { selector: 'button' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
