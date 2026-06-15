import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FilterTabBar } from '@/components/shared/FilterTabBar';

const tabs = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'fav', label: 'Ulubione' },
];

describe('FilterTabBar', () => {
  it('renders all tabs and fires onChange with the clicked value', async () => {
    const onChange = vi.fn();
    const { user } = render(<FilterTabBar tabs={tabs} active="all" onChange={onChange} />);

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await user.click(screen.getByText('Ulubione'));
    expect(onChange).toHaveBeenCalledWith('fav');
  });

  it('marks the active tab with aria-selected', () => {
    render(<FilterTabBar tabs={tabs} active="fav" onChange={() => {}} />);
    const fav = screen.getByText('Ulubione').closest('button')!;
    expect(fav).toHaveAttribute('aria-selected', 'true');
  });
});
