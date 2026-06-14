import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useBrowserStore } from '@/stores/useBrowserStore';
import BrowserHistoryDialog from './BrowserHistoryDialog';

beforeEach(() => {
  useBrowserStore.setState({ history: [] });
});

describe('BrowserHistoryDialog', () => {
  it('renders the history dialog with the empty state', () => {
    render(<BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });
});
