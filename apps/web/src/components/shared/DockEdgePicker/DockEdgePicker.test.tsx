import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { DockEdge } from '@/stores/useDockStore';
import { DockEdgePicker } from '@/components/shared/DockEdgePicker';

const LABELS: Record<DockEdge, string> = {
  bottom: 'Bottom',
  top: 'Top',
  left: 'Left',
  right: 'Right',
};

describe('DockEdgePicker', () => {
  it('renders a radiogroup with one radio per edge and fires onSelect on click', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <DockEdgePicker
        value="bottom"
        onSelect={onSelect}
        getLabel={e => LABELS[e]}
        ariaLabel="Dock edge"
      />
    );

    expect(screen.getByRole('radiogroup', { name: 'Dock edge' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);

    await user.click(screen.getByRole('radio', { name: 'Top' }));
    expect(onSelect).toHaveBeenCalledWith('top');
  });

  it('marks the active edge as checked', () => {
    render(
      <DockEdgePicker
        value="left"
        onSelect={() => {}}
        getLabel={e => LABELS[e]}
        ariaLabel="Dock edge"
      />
    );
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
  });
});
