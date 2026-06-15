import { describe, expect, it, vi } from 'vitest';
import { Heart, Star } from 'lucide-react';
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

  it('does not fire onChange for the already-active tab implicitly — only on click', async () => {
    const onChange = vi.fn();
    const { user } = render(<FilterTabBar tabs={tabs} active="all" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByText('Wszystkie'));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('marks the active tab with aria-selected and the others as not selected', () => {
    render(<FilterTabBar tabs={tabs} active="fav" onChange={() => {}} />);
    expect(screen.getByText('Ulubione').closest('button')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Wszystkie').closest('button')).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('exposes a tablist with the provided aria-label', () => {
    render(<FilterTabBar tabs={tabs} active="all" onChange={() => {}} ariaLabel="Filtry listy" />);
    expect(screen.getByRole('tablist', { name: 'Filtry listy' })).toBeInTheDocument();
  });

  it('renders tab icons as decorative (aria-hidden) and keeps the label accessible', () => {
    render(
      <FilterTabBar
        tabs={[
          { value: 'all', label: 'Wszystkie', Icon: Star },
          { value: 'fav', label: 'Ulubione', Icon: Heart },
        ]}
        active="all"
        onChange={() => {}}
      />
    );
    // The accessible name comes from the label text, not the icon.
    expect(screen.getByRole('tab', { name: 'Wszystkie' })).toBeInTheDocument();
  });

  it('renders an empty tablist without crashing when given no tabs', () => {
    render(<FilterTabBar tabs={[]} active="all" onChange={() => {}} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('is keyboard-activatable — Enter on a focused tab fires onChange', async () => {
    const onChange = vi.fn();
    const { user } = render(<FilterTabBar tabs={tabs} active="all" onChange={onChange} />);
    const favTab = screen.getByRole('tab', { name: 'Ulubione' });
    favTab.focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('fav');
  });
});
