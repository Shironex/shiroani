import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiaryEntry } from '@shiroani/shared';
import DiarySidebar from './DiarySidebar';

const today = new Date().toISOString();

function createEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: today,
    updatedAt: today,
    isPinned: false,
    ...overrides,
  };
}

describe('DiarySidebar', () => {
  it('renders the streak panel with an empty entry set', () => {
    const { container } = render(<DiarySidebar entries={[]} />);
    // The sidebar landmark always renders, even with no entries.
    expect(container.querySelector('aside')).toBeInTheDocument();
    // Streak card shows a "0" current-streak value (one of several zero stats).
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('renders derived stats for a populated entry set', () => {
    render(<DiarySidebar entries={[createEntry({ id: 1, tags: ['anime'] })]} />);
    // The top-tags block surfaces the entry's tag once stats are computed.
    expect(screen.getByText('#anime · 1')).toBeInTheDocument();
  });
});
