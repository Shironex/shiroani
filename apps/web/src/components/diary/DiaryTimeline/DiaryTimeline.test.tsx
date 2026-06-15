import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryTimeline from './DiaryTimeline';

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Mój wpis',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Treść wpisu' }] }],
    }),
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    isPinned: false,
    ...overrides,
  };
}

const handlers = () => ({
  onSelect: vi.fn(),
  onRemove: vi.fn(),
  onTogglePin: vi.fn(),
});

describe('DiaryTimeline', () => {
  it('renders entries with their excerpt under a day header', () => {
    render(<DiaryTimeline entries={[createEntry({ title: 'Wpis dnia' })]} {...handlers()} />);
    expect(screen.getByText('Wpis dnia')).toBeInTheDocument();
    expect(screen.getByText('Treść wpisu')).toBeInTheDocument();
  });

  it('labels today\'s group with the "Today" prefix', () => {
    render(<DiaryTimeline entries={[createEntry()]} {...handlers()} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('Today');
  });

  it('groups entries from the same day under a single header', () => {
    render(
      <DiaryTimeline
        entries={[createEntry({ id: 1, title: 'First' }), createEntry({ id: 2, title: 'Second' })]}
        {...handlers()}
      />
    );
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('splits entries from different days into separate headers', () => {
    render(
      <DiaryTimeline
        entries={[
          createEntry({ id: 1, title: 'Today entry', createdAt: today.toISOString() }),
          createEntry({
            id: 2,
            title: 'Yesterday entry',
            createdAt: yesterday.toISOString(),
          }),
        ]}
        {...handlers()}
      />
    );
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(2);
    expect(headings.some(h => h.textContent?.includes('Today'))).toBe(true);
    expect(headings.some(h => h.textContent?.includes('Yesterday'))).toBe(true);
  });

  it('falls back to "Untitled" when an entry has no title', () => {
    render(<DiaryTimeline entries={[createEntry({ title: '' })]} {...handlers()} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });

  it('shows the anime link only when animeTitle is present', () => {
    const { rerender } = render(
      <DiaryTimeline entries={[createEntry({ animeTitle: 'Frieren' })]} {...handlers()} />
    );
    expect(screen.getByText('Frieren')).toBeInTheDocument();

    rerender(<DiaryTimeline entries={[createEntry({ animeTitle: undefined })]} {...handlers()} />);
    expect(screen.queryByText('Frieren')).not.toBeInTheDocument();
  });

  it('renders tag chips, capped at six', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    render(<DiaryTimeline entries={[createEntry({ tags })]} {...handlers()} />);
    expect(screen.getByText('#a')).toBeInTheDocument();
    expect(screen.getByText('#f')).toBeInTheDocument();
    expect(screen.queryByText('#g')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty entry set', () => {
    render(<DiaryTimeline entries={[]} {...handlers()} />);
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('calls onSelect with the entry when its row is activated', async () => {
    const entry = createEntry({ title: 'Klik' });
    const cbs = handlers();
    const { user } = render(<DiaryTimeline entries={[entry]} {...cbs} />);
    // The whole row is one accessible button named by the entry title.
    await user.click(screen.getByRole('button', { name: 'Klik' }));
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });

  it('toggles pin without selecting the row', async () => {
    const entry = createEntry({ isPinned: false });
    const cbs = handlers();
    const { user } = render(<DiaryTimeline entries={[entry]} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Pin' }));
    expect(cbs.onTogglePin).toHaveBeenCalledWith(entry);
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('removes the row without selecting it', async () => {
    const entry = createEntry();
    const cbs = handlers();
    const { user } = render(<DiaryTimeline entries={[entry]} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(cbs.onRemove).toHaveBeenCalledWith(entry);
    expect(cbs.onSelect).not.toHaveBeenCalled();
  });

  it('activates the row from the keyboard (Enter)', async () => {
    const entry = createEntry({ title: 'Keyboard' });
    const cbs = handlers();
    const { user } = render(<DiaryTimeline entries={[entry]} {...cbs} />);
    // The row's open affordance is a native button named by the title.
    screen.getByRole('button', { name: 'Keyboard' }).focus();
    await user.keyboard('{Enter}');
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });
});
