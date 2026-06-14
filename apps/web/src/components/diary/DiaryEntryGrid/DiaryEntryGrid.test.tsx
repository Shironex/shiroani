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
  it('renders entry cards in grid mode', () => {
    render(
      <DiaryEntryGrid
        entries={[createEntry({ id: 1, title: 'Wpis A' })]}
        viewMode="grid"
        {...handlers()}
      />
    );
    expect(screen.getByText('Wpis A')).toBeInTheDocument();
  });

  it('renders entry rows in list mode', () => {
    render(
      <DiaryEntryGrid
        entries={[createEntry({ id: 2, title: 'Wpis B' })]}
        viewMode="list"
        {...handlers()}
      />
    );
    expect(screen.getByText('Wpis B')).toBeInTheDocument();
  });
});
