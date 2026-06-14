import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryTimeline from './DiaryTimeline';

const today = new Date().toISOString();

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Mój wpis',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Treść wpisu' }] }],
    }),
    createdAt: today,
    updatedAt: today,
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
  it('renders entries grouped under day headers', () => {
    render(
      <DiaryTimeline entries={[createEntry({ id: 1, title: 'Wpis dnia' })]} {...handlers()} />
    );
    expect(screen.getByText('Wpis dnia')).toBeInTheDocument();
    expect(screen.getByText('Treść wpisu')).toBeInTheDocument();
  });

  it('calls onSelect when a row is clicked', async () => {
    const entry = createEntry({ title: 'Klik' });
    const cbs = handlers();
    const { user } = render(<DiaryTimeline entries={[entry]} {...cbs} />);
    await user.click(screen.getByText('Klik'));
    expect(cbs.onSelect).toHaveBeenCalledWith(entry);
  });
});
