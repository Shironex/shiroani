import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

// No active pane -> no webview lookup; keep the find bar isolated from the
// Electron <webview> registry.
vi.mock('../webviewRefs', () => ({
  getWebview: vi.fn(() => undefined),
}));

import FindBar from './FindBar';

describe('FindBar', () => {
  it('renders the search input and closes on Escape', async () => {
    const onClose = vi.fn();
    const { user } = render(<FindBar activePaneId={null} onClose={onClose} />);

    const input = screen.getByPlaceholderText('Find in page');
    expect(input).toBeInTheDocument();

    await user.type(input, '{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
