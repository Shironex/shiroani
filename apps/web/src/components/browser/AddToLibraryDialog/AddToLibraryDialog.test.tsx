import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

// The dialog scrapes metadata off the focused webview on open; stub the
// registry so the smoke test renders without an Electron <webview>.
vi.mock('@/components/browser/webviewRefs', () => ({
  getWebview: vi.fn(() => undefined),
}));

import AddToLibraryDialog from './AddToLibraryDialog';

describe('AddToLibraryDialog', () => {
  it('renders the dialog with the seeded title', () => {
    render(
      <AddToLibraryDialog
        open
        onOpenChange={vi.fn()}
        url="https://shinden.pl/series/frieren"
        title="Frieren"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Frieren')).toBeInTheDocument();
  });
});
