import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { AddressSuggestion } from '../useAddressSuggestions';
import AddressSuggestions from './AddressSuggestions';

const suggestions: AddressSuggestion[] = [
  { id: 'addr-sug-history-0', url: 'https://shinden.pl', title: 'Shinden', source: 'history' },
];

describe('AddressSuggestions', () => {
  it('renders a row per suggestion and fires onSelect on mousedown', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <AddressSuggestions
        listboxId="lb"
        suggestions={suggestions}
        activeIndex={0}
        onHoverIndex={vi.fn()}
        onSelect={onSelect}
      />
    );

    const option = screen.getByRole('option', { name: /Shinden/ });
    expect(option).toBeInTheDocument();
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith('https://shinden.pl');
  });
});
