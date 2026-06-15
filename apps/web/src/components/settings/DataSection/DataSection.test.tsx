import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { DataSection } from '.';

// The delete dialog's confirm path imports wipe-all-data; the tests here never
// confirm, but the module is mocked so a stray import never touches real storage.
vi.mock('@/lib/wipe-all-data', () => ({ wipeAllData: vi.fn() }));

describe('DataSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the export, import and danger-zone cards', () => {
    render(<DataSection />);
    expect(screen.getByRole('heading', { name: 'Export data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete all data' })).toBeInTheDocument();
  });

  it('opens the export dialog from the export action', async () => {
    const { user } = render(<DataSection />);
    await user.click(screen.getByRole('button', { name: 'Export everything' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Export data')).toBeInTheDocument();
  });

  it('wires the import action without throwing', async () => {
    // The import dialog auto-opens the file picker on mount; without an Electron
    // bridge the pick resolves to nothing and the controlled dialog closes again,
    // so assert the action is present and clickable rather than a settled dialog.
    const { user } = render(<DataSection />);
    const importButton = screen.getByRole('button', { name: 'Pick a JSON file' });
    expect(importButton).toBeInTheDocument();
    await user.click(importButton);
  });

  it('opens the delete-all-data dialog from the danger-zone action', async () => {
    const { user } = render(<DataSection />);
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    expect(await screen.findByRole('heading', { name: 'Delete all data?' })).toBeInTheDocument();
  });

  it('does not render any dialog until an action is taken', () => {
    render(<DataSection />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('routes the dialog "export first" action back to the export dialog', async () => {
    const { user } = render(<DataSection />);
    await user.click(screen.getByRole('button', { name: 'Delete all data' }));
    await screen.findByRole('heading', { name: 'Delete all data?' });
    await user.click(screen.getByRole('button', { name: /Export a backup first/ }));
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Export data')).toBeInTheDocument();
    });
  });
});
