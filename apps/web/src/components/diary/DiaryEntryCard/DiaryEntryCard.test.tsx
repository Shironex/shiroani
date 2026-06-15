import { render, screen } from '@/test/test-utils';
import { vi } from 'vitest';
import DiaryEntryCard from './DiaryEntryCard';
import type { DiaryEntry } from '@shiroani/shared';

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Mój wpis',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Treść wpisu' }] }],
    }),
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

describe('DiaryEntryCard', () => {
  it('renders entry title', () => {
    render(<DiaryEntryCard entry={createEntry()} {...handlers()} />);
    expect(screen.getByText('Mój wpis')).toBeInTheDocument();
  });

  it("exposes the title as the open-card button's accessible name", () => {
    render(<DiaryEntryCard entry={createEntry({ title: 'Otwórz mnie' })} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Otwórz mnie' })).toBeInTheDocument();
  });

  it('shows "Untitled" when title is empty', () => {
    render(<DiaryEntryCard entry={createEntry({ title: '' })} {...handlers()} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows anime title when entry.animeTitle exists', () => {
    render(<DiaryEntryCard entry={createEntry({ animeTitle: 'Steins;Gate' })} {...handlers()} />);
    expect(screen.getByText('Steins;Gate')).toBeInTheDocument();
  });

  it('does not render anime title paragraph when animeTitle is absent', () => {
    render(<DiaryEntryCard entry={createEntry()} {...handlers()} />);
    expect(screen.queryByText('Steins;Gate')).not.toBeInTheDocument();
  });

  it('exposes the pin action labelled "Pin" when not pinned', () => {
    render(<DiaryEntryCard entry={createEntry({ isPinned: false })} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Pin' })).toBeInTheDocument();
  });

  it('exposes the pin action labelled "Unpin" when pinned', () => {
    render(<DiaryEntryCard entry={createEntry({ isPinned: true })} {...handlers()} />);
    expect(screen.getByRole('button', { name: 'Unpin' })).toBeInTheDocument();
  });

  it('displays up to 2 tags', () => {
    render(
      <DiaryEntryCard
        entry={createEntry({ tags: ['anime', 'recenzja', 'isekai'] })}
        {...handlers()}
      />
    );
    expect(screen.getByText('anime')).toBeInTheDocument();
    expect(screen.getByText('recenzja')).toBeInTheDocument();
    expect(screen.queryByText('isekai')).not.toBeInTheDocument();
  });

  it('shows a mood icon when entry.mood is set', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ mood: 'great' })} {...handlers()} />
    );
    // mood=great adds a Sparkles icon beyond the open/pin/remove controls.
    const moodCard = container.querySelectorAll('svg');
    expect(moodCard.length).toBeGreaterThan(2);
  });

  it('calls onSelect with the entry when the card is activated', async () => {
    const entry = createEntry({ title: 'Klik' });
    const cbs = handlers();
    const { user } = render(<DiaryEntryCard entry={entry} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Klik' }));
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });

  it('calls onTogglePin (not onSelect) when the pin button is clicked', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user } = render(<DiaryEntryCard entry={entry} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    expect(cbs.onTogglePin).toHaveBeenCalledWith(entry);
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('calls onRemove (not onSelect) when the remove button is clicked', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user } = render(<DiaryEntryCard entry={entry} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(cbs.onRemove).toHaveBeenCalledWith(entry);
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('renders the date formatted under the active (EN) locale', () => {
    render(<DiaryEntryCard entry={createEntry({ createdAt: '2025-06-15' })} {...handlers()} />);
    const formatted = new Date('2025-06-15').toLocaleDateString('en', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    expect(screen.getByText(formatted)).toBeInTheDocument();
  });

  it('renders content preview from contentJson', () => {
    render(<DiaryEntryCard entry={createEntry()} {...handlers()} />);
    expect(screen.getByText('Treść wpisu')).toBeInTheDocument();
  });

  it('renders the resolved gradient from coverGradient', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ coverGradient: 'sakura' })} {...handlers()} />
    );
    const header = container.querySelector('.paper-grain') as HTMLElement;
    // jsdom normalizes hex colors to rgb.
    expect(header.style.background).toBe(
      'linear-gradient(135deg, rgb(255, 146, 168) 0%, rgb(255, 183, 197) 50%, rgb(255, 200, 214) 100%)'
    );
  });
});
