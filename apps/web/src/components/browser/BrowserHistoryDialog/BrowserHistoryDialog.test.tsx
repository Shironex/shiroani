import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { BrowserHistoryEntry } from '@shiroani/shared';
import { render, screen, within } from '@/test/test-utils';
import { useBrowserStore } from '@/stores/useBrowserStore';
import BrowserHistoryDialog from './BrowserHistoryDialog';

function entry(id: string, title: string, url: string): BrowserHistoryEntry {
  return { id, title, url, visitedAt: Date.now() };
}

const history: BrowserHistoryEntry[] = [
  entry('h1', 'Shinden', 'https://shinden.pl'),
  entry('h2', 'YouTube', 'https://youtube.com'),
];

beforeEach(() => {
  useBrowserStore.setState({ history: [] });
});

describe('BrowserHistoryDialog', () => {
  it('renders the empty state when there is no history', () => {
    render(<BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('renders a row per seeded history entry', () => {
    useBrowserStore.setState({ history });
    render(<BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByText('Shinden')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('filters rows by the search query', async () => {
    useBrowserStore.setState({ history });
    const { user } = render(
      <BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );

    await user.type(screen.getByLabelText('Search history'), 'youtube');

    expect(screen.queryByText('Shinden')).not.toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('shows a no-results hint when the query matches nothing', async () => {
    useBrowserStore.setState({ history });
    const { user } = render(
      <BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );

    await user.type(screen.getByLabelText('Search history'), 'zzz-no-match');
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('navigates and closes when a row is opened', async () => {
    useBrowserStore.setState({ history });
    const onNavigate = vi.fn();
    const onOpenChange = vi.fn();
    const { user } = render(
      <BrowserHistoryDialog open onOpenChange={onOpenChange} onNavigate={onNavigate} />
    );

    await user.click(screen.getByText('Shinden'));
    expect(onNavigate).toHaveBeenCalledWith('https://shinden.pl');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('removes a single entry via its remove button', async () => {
    useBrowserStore.setState({ history });
    const removeHistoryEntry = vi.fn();
    useBrowserStore.setState({ removeHistoryEntry });
    const { user } = render(
      <BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );

    const shindenRow = screen.getByText('Shinden').closest('li') as HTMLElement;
    await user.click(within(shindenRow).getByRole('button', { name: 'Remove entry' }));
    expect(removeHistoryEntry).toHaveBeenCalledWith('h1');
  });

  it('clears all history from the clear-all action', async () => {
    useBrowserStore.setState({ history });
    const clearHistory = vi.fn();
    useBrowserStore.setState({ clearHistory });
    const { user } = render(
      <BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    const alertDialog = screen.getByRole('alertdialog');
    await user.click(within(alertDialog).getByRole('button', { name: 'Clear all' }));

    expect(clearHistory).toHaveBeenCalledOnce();
  });

  it('disables clear-all when there is no history', () => {
    render(<BrowserHistoryDialog open onOpenChange={vi.fn()} onNavigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });
});
