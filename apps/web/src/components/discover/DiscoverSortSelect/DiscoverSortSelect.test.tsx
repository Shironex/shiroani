import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiscoverSortSelect from './DiscoverSortSelect';

describe('DiscoverSortSelect', () => {
  it('renders the sort trigger with its accessible label', () => {
    render(<DiscoverSortSelect value="score" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
  });

  it('reflects the current value in the trigger', () => {
    render(<DiscoverSortSelect value="popularity" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /sort/i })).toHaveTextContent('Popularity');
  });

  // Opening the Radix listbox and picking an option is covered by the Storybook
  // play test (real Chromium); jsdom lacks the pointer-capture APIs Radix Select
  // needs to open its portalled content.

  it('disables the trigger when disabled', () => {
    render(<DiscoverSortSelect value="score" onChange={vi.fn()} disabled />);

    expect(screen.getByRole('combobox', { name: /sort/i })).toBeDisabled();
  });
});
