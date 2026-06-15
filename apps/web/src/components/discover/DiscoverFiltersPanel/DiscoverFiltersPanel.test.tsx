import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DiscoverFilters } from '@shiroani/shared';
import DiscoverFiltersPanel from './DiscoverFiltersPanel';

function renderPanel(overrides: Partial<Parameters<typeof DiscoverFiltersPanel>[0]> = {}) {
  const onChange = vi.fn();
  const result = render(
    <DiscoverFiltersPanel
      filters={{}}
      disabled={false}
      connected
      onChange={onChange}
      {...overrides}
    />
  );
  return { ...result, onChange };
}

describe('DiscoverFiltersPanel', () => {
  it('renders the collapsed filters header', () => {
    renderPanel();

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.queryByText('Score range')).not.toBeInTheDocument();
  });

  it('expands the facet controls when the header is clicked', async () => {
    const { user } = renderPanel();

    await user.click(screen.getByText('Filters'));

    expect(screen.getByText('Score range')).toBeInTheDocument();
    expect(screen.getByLabelText('Airing status')).toBeInTheDocument();
  });

  it('shows the active-filter count badge derived from the filters', () => {
    const filters: DiscoverFilters = { status: 'RELEASING', tags: ['isekai'] };
    renderPanel({ filters });

    expect(screen.getByText('Active: 2')).toBeInTheDocument();
  });

  it('adds a tag on Enter and forwards it through onChange', async () => {
    const { user, onChange } = renderPanel();

    await user.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, 'isekai{Enter}');

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['isekai'] }));
  });

  it('does not add a blank tag', async () => {
    const { user, onChange } = renderPanel();

    await user.click(screen.getByText('Filters'));
    const input = screen.getByPlaceholderText('Add tag...');
    await user.type(input, '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an existing tag through its remove button', async () => {
    const { user, onChange } = renderPanel({ filters: { tags: ['isekai', 'mecha'] } });

    await user.click(screen.getByText('Filters'));
    await user.click(screen.getByRole('button', { name: 'Remove tag isekai' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ tags: ['mecha'] }));
  });

  it('clears every filter from the reset action when filters are active', async () => {
    const { user, onChange } = renderPanel({ filters: { status: 'RELEASING' } });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it('hides the reset action when no filters are active', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('hides the "haven\'t seen" toggle when disconnected', async () => {
    const { user } = renderPanel({ connected: false });

    await user.click(screen.getByText('Filters'));

    expect(screen.queryByText("Haven't seen")).not.toBeInTheDocument();
  });
});
