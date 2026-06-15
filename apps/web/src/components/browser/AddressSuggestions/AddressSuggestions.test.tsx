import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AddressSuggestion } from '../useAddressSuggestions';
import AddressSuggestions from './AddressSuggestions';

const suggestions: AddressSuggestion[] = [
  { id: 'addr-sug-history-0', url: 'https://shinden.pl', title: 'Shinden', source: 'history' },
  { id: 'addr-sug-bookmark-1', url: 'https://youtube.com', title: 'YouTube', source: 'bookmark' },
];

function renderList(overrides: Partial<React.ComponentProps<typeof AddressSuggestions>> = {}) {
  return render(
    <AddressSuggestions
      listboxId="lb"
      suggestions={suggestions}
      activeIndex={0}
      onHoverIndex={vi.fn()}
      onSelect={vi.fn()}
      {...overrides}
    />
  );
}

describe('AddressSuggestions', () => {
  it('renders a labelled listbox with an option per suggestion', () => {
    renderList();

    const listbox = screen.getByRole('listbox', { name: 'Address suggestions' });
    expect(listbox).toHaveAttribute('id', 'lb');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('marks the active option with aria-selected', () => {
    renderList({ activeIndex: 1 });

    expect(screen.getByRole('option', { name: /Shinden/ })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByRole('option', { name: /YouTube/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('fires onSelect with the row url on mousedown', async () => {
    const onSelect = vi.fn();
    const { user } = renderList({ onSelect });

    await user.click(screen.getByRole('option', { name: /Shinden/ }));
    expect(onSelect).toHaveBeenCalledWith('https://shinden.pl');
  });

  it('reports the hovered row index', async () => {
    const onHoverIndex = vi.fn();
    const { user } = renderList({ onHoverIndex });

    await user.hover(screen.getByRole('option', { name: /YouTube/ }));
    expect(onHoverIndex).toHaveBeenCalledWith(1);
  });

  it('falls back to the url when a suggestion has no title', () => {
    renderList({
      suggestions: [
        { id: 'addr-sug-frequent-0', url: 'https://example.com', title: '', source: 'frequent' },
      ],
    });

    expect(screen.getByRole('option', { name: /example\.com/ })).toBeInTheDocument();
  });
});
