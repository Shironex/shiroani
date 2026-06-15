import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

// The dialog scrapes metadata off the focused webview on open; stub the
// registry so the smoke test renders without an Electron <webview>.
vi.mock('@/components/browser/webviewRefs', () => ({
  getWebview: vi.fn(() => undefined),
}));

import AddToLibraryDialog from './AddToLibraryDialog';

function renderDialog(overrides: Partial<React.ComponentProps<typeof AddToLibraryDialog>> = {}) {
  return render(
    <AddToLibraryDialog
      open
      onOpenChange={vi.fn()}
      url="https://shinden.pl/series/frieren"
      title="Frieren"
      {...overrides}
    />
  );
}

describe('AddToLibraryDialog', () => {
  it('renders the dialog seeded with the page title and url', () => {
    renderDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Frieren')).toBeInTheDocument();
    expect(screen.getByText('https://shinden.pl/series/frieren')).toBeInTheDocument();
  });

  it('shows the "No URL" placeholder when no url is provided', () => {
    renderDialog({ url: '' });

    expect(screen.getByText('No URL')).toBeInTheDocument();
  });

  it('lets the user edit the title', async () => {
    const { user } = renderDialog({ title: '' });

    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'Bocchi the Rock');
    expect(titleInput).toHaveValue('Bocchi the Rock');
  });

  it('disables the submit button while the title is empty', () => {
    renderDialog({ title: '' });

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('enables the submit button once a title is present', () => {
    renderDialog({ title: 'Frieren' });

    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('closes the dialog from the cancel button', async () => {
    const onOpenChange = vi.fn();
    const { user } = renderDialog({ onOpenChange });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('defaults the status select to "Plan to Watch"', () => {
    renderDialog();

    expect(screen.getByRole('combobox')).toHaveTextContent('Plan to Watch');
  });
});
