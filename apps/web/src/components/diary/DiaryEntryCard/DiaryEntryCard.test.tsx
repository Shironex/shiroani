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

  it('shows pin indicator when entry.isPinned is true', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ isPinned: true })} {...handlers()} />
    );
    // The pinned indicator is a standalone Pin icon inside .absolute.top-1\\.5.left-1\\.5
    // There should be 2 Pin icons when pinned: the indicator + the action button
    // When not pinned there is only the action button
    const svgs = container.querySelectorAll('svg');
    // isPinned=true renders: indicator Pin + action Pin + Trash = 3 svgs
    expect(svgs.length).toBe(3);
  });

  it('does not show pin indicator when entry.isPinned is false', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ isPinned: false })} {...handlers()} />
    );
    // isPinned=false renders: action Pin + Trash = 2 svgs
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
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

  it('shows mood icon when entry.mood is set', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ mood: 'great' })} {...handlers()} />
    );
    // mood=great renders a Sparkles icon (extra svg beyond Pin + Trash)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(3);
  });

  it('calls onSelect with entry when card is clicked', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user } = render(<DiaryEntryCard entry={entry} {...cbs} />);

    await user.click(screen.getByText('Mój wpis'));
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });

  it('calls onTogglePin with entry when pin button is clicked', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user, container } = render(<DiaryEntryCard entry={entry} {...cbs} />);

    // Pin button is the first button
    const buttons = container.querySelectorAll('button');
    await user.click(buttons[0]);

    expect(cbs.onTogglePin).toHaveBeenCalledWith(entry);
    // Should NOT propagate to onSelect
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('calls onRemove with entry when remove button is clicked', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user, container } = render(<DiaryEntryCard entry={entry} {...cbs} />);

    // Trash button is the second button
    const buttons = container.querySelectorAll('button');
    await user.click(buttons[1]);

    expect(cbs.onRemove).toHaveBeenCalledWith(entry);
    // Should NOT propagate to onSelect
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('renders formatted date', () => {
    render(<DiaryEntryCard entry={createEntry({ createdAt: '2025-06-15' })} {...handlers()} />);
    // formatDate('2025-06-15') now follows the active i18n.language; tests
    // boot in EN (default), so the locale-aware format must match.
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

  it('renders gradient from coverGradient', () => {
    const { container } = render(
      <DiaryEntryCard entry={createEntry({ coverGradient: 'sakura' })} {...handlers()} />
    );
    const header = container.querySelector('.paper-grain') as HTMLElement;
    // jsdom normalizes hex colors to rgb
    expect(header.style.background).toBe(
      'linear-gradient(135deg, rgb(255, 146, 168) 0%, rgb(255, 183, 197) 50%, rgb(255, 200, 214) 100%)'
    );
  });
});
