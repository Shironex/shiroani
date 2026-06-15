import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

// No active pane -> no webview lookup; keep the find bar isolated from the
// Electron <webview> registry.
vi.mock('../webviewRefs', () => ({
  getWebview: vi.fn(() => undefined),
}));

import FindBar from './FindBar';

describe('FindBar', () => {
  it('renders the search input inside a search region', () => {
    render(<FindBar activePaneId={null} onClose={vi.fn()} />);

    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Find in page')).toBeInTheDocument();
  });

  it('autofocuses the input on mount so the user can type immediately', () => {
    render(<FindBar activePaneId={null} onClose={vi.fn()} />);

    expect(screen.getByPlaceholderText('Find in page')).toHaveFocus();
  });

  it('updates the input value as the user types', async () => {
    const { user } = render(<FindBar activePaneId={null} onClose={vi.fn()} />);

    const input = screen.getByPlaceholderText('Find in page');
    await user.type(input, 'frieren');
    expect(input).toHaveValue('frieren');
  });

  it('disables the next/previous buttons while there are no matches', () => {
    render(<FindBar activePaneId={null} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const { user } = render(<FindBar activePaneId={null} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText('Find in page'), '{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes from the close button', async () => {
    const onClose = vi.fn();
    const { user } = render(<FindBar activePaneId={null} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
