import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEntryGrid from './DiaryEntryGrid';

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Mój wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: '2025-06-15',
    updatedAt: '2025-06-15',
    isPinned: false,
    ...overrides,
  };
}

const handlers = () => ({
  onSelect: vi.fn(),
  onRemove: vi.fn(),
  onTogglePin: vi.fn(),
});

describe('DiaryEntryGrid', () => {
  it('renders all entries as cards in grid mode', () => {
    render(
      <DiaryEntryGrid
        entries={[createEntry({ id: 1, title: 'Wpis A' }), createEntry({ id: 2, title: 'Wpis B' })]}
        viewMode="grid"
        {...handlers()}
      />
    );
    expect(screen.getByText('Wpis A')).toBeInTheDocument();
    expect(screen.getByText('Wpis B')).toBeInTheDocument();
  });

  it('renders all entries as rows in list mode', () => {
    render(
      <DiaryEntryGrid
        entries={[createEntry({ id: 1, title: 'Wpis A' }), createEntry({ id: 2, title: 'Wpis B' })]}
        viewMode="list"
        {...handlers()}
      />
    );
    expect(screen.getByText('Wpis A')).toBeInTheDocument();
    expect(screen.getByText('Wpis B')).toBeInTheDocument();
  });

  it('falls back to "Untitled" for a title-less row in list mode', () => {
    render(
      <DiaryEntryGrid entries={[createEntry({ title: '' })]} viewMode="list" {...handlers()} />
    );
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('appends the anime title to the list-row meta when present', () => {
    render(
      <DiaryEntryGrid
        entries={[createEntry({ animeTitle: 'Frieren' })]}
        viewMode="list"
        {...handlers()}
      />
    );
    expect(screen.getByText(/Frieren/)).toBeInTheDocument();
  });

  it('calls onSelect with the entry when a list row is activated', async () => {
    const entry = createEntry({ title: 'Row click' });
    const cbs = handlers();
    const { user } = render(<DiaryEntryGrid entries={[entry]} viewMode="list" {...cbs} />);
    await user.click(screen.getByRole('button', { name: /Row click/ }));
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });

  it('renders nothing for an empty entry set', () => {
    const { container } = render(<DiaryEntryGrid entries={[]} viewMode="grid" {...handlers()} />);
    expect(container.querySelector('h3')).not.toBeInTheDocument();
  });
});
