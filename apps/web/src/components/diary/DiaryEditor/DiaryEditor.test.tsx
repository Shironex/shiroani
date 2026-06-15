import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import type { DiaryEntry, DiaryCreatePayload, DiaryUpdatePayload } from '@shiroani/shared';
import DiaryEditor from './DiaryEditor';

function makeEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Refleksja',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Treść' }] }],
    }),
    createdAt: '2025-06-15',
    updatedAt: '2025-06-15',
    isPinned: false,
    coverGradient: 'sakura',
    mood: 'great',
    tags: ['anime'],
    ...overrides,
  };
}

function handlers() {
  return {
    onClose: vi.fn(),
    onCreate: vi.fn(async (_payload: DiaryCreatePayload) => true),
    onUpdate: vi.fn(async (_payload: DiaryUpdatePayload) => true),
  };
}

describe('DiaryEditor', () => {
  it('renders the new-entry region with a focusable title input', () => {
    render(<DiaryEditor entry={null} {...handlers()} />);
    expect(screen.getByRole('region', { name: 'New diary entry' })).toBeInTheDocument();
    expect(screen.getByLabelText('Entry title')).toBeInTheDocument();
  });

  it('renders the edit region and seeds inputs from the entry', () => {
    render(<DiaryEditor entry={makeEntry({ title: 'Istniejący' })} {...handlers()} />);
    expect(screen.getByRole('region', { name: 'Diary entry editor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Entry title')).toHaveValue('Istniejący');
  });

  it('calls onClose when the back button is clicked', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    const backButtons = screen.getAllByRole('button', { name: 'Back to diary' });
    await user.click(backButtons[0]!);
    expect(cbs.onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cbs.onClose).toHaveBeenCalled();
  });

  it('creates a new entry with the typed title and closes on success', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    await user.type(screen.getByLabelText('Entry title'), 'Nowy tytuł');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() =>
      expect(cbs.onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nowy tytuł' }))
    );
    await waitFor(() => expect(cbs.onClose).toHaveBeenCalled());
  });

  it('keeps the editor open (does not close) when the save fails', async () => {
    const cbs = handlers();
    cbs.onCreate.mockResolvedValueOnce(false);
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    await user.type(screen.getByLabelText('Entry title'), 'Nieudane');
    await user.click(screen.getByRole('button', { name: 'Add entry' }));
    await waitFor(() => expect(cbs.onCreate).toHaveBeenCalled());
    expect(cbs.onClose).not.toHaveBeenCalled();
  });

  it('updates an existing entry (carrying its id) on save', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={makeEntry({ id: 42 })} {...cbs} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(cbs.onUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }))
    );
  });

  it('adds a tag from the tag input and removes it again', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    const tagInput = screen.getByLabelText('Add tag');
    await user.type(tagInput, 'isekai{Enter}');
    expect(screen.getByText('#isekai')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove tag isekai' }));
    expect(screen.queryByText('#isekai')).not.toBeInTheDocument();
  });

  it('strips a leading # and de-duplicates tags', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={makeEntry({ tags: ['anime'] })} {...cbs} />);
    const tagInput = screen.getByLabelText('Add tag');
    await user.type(tagInput, '#anime{Enter}');
    // 'anime' already exists → no duplicate chip is added.
    expect(screen.getAllByText('#anime')).toHaveLength(1);
  });

  it('toggles the pin state from the cover pin control', async () => {
    const cbs = handlers();
    const { user } = render(<DiaryEditor entry={null} {...cbs} />);
    const pin = screen.getByRole('button', { name: 'Pin entry' });
    expect(pin).toHaveAttribute('aria-pressed', 'false');
    await user.click(pin);
    expect(screen.getByRole('button', { name: 'Unpin entry' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
