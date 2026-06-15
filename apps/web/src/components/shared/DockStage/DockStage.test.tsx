import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { DockStage } from '@/components/shared/DockStage';
import type { DockStageItem } from '@/components/shared/DockStage';

describe('DockStage', () => {
  it('renders the 4-dot placeholder when no items are provided', () => {
    const { container } = render(<DockStage edge="bottom" />);
    // The mini-dock falls back to PLACEHOLDER_ITEMS (4 slots), each a rounded slot span.
    const slots = container.querySelectorAll('span.rounded-full');
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });

  it('renders one slot per provided item, including custom icon content', () => {
    const items: DockStageItem[] = [
      { id: 'a', highlighted: true, icon: <span data-testid="icon-a">A</span> },
      { id: 'b', icon: <span data-testid="icon-b">B</span> },
    ];
    render(<DockStage edge="bottom" items={items} />);
    expect(screen.getByTestId('icon-a')).toBeInTheDocument();
    expect(screen.getByTestId('icon-b')).toBeInTheDocument();
  });

  it('renders the optional label caption above the stage', () => {
    render(<DockStage edge="bottom" label="PODGLĄD" />);
    expect(screen.getByText('PODGLĄD')).toBeInTheDocument();
  });

  it('does not render a label element when none is given', () => {
    render(<DockStage edge="bottom" data-testid="no-label" />);
    // Caption uses uppercase mono tracking; with no label it should be absent.
    expect(screen.queryByText('PODGLĄD')).not.toBeInTheDocument();
  });

  it('orients the dock as a row for horizontal edges (bottom/top)', () => {
    const { container } = render(<DockStage edge="bottom" />);
    expect(container.querySelector('.flex-row')).toBeInTheDocument();
    expect(container.querySelector('.flex-col')).not.toBeInTheDocument();
  });

  it('orients the dock as a column for vertical edges (left/right)', () => {
    const { container } = render(<DockStage edge="left" />);
    expect(container.querySelector('.flex-col')).toBeInTheDocument();
    expect(container.querySelector('.flex-row')).not.toBeInTheDocument();
  });

  it.each(['bottom', 'top', 'left', 'right'] as const)(
    'renders without crashing for the %s edge',
    edge => {
      const { container } = render(<DockStage edge={edge} />);
      expect(container.firstChild).toBeTruthy();
    }
  );

  it('renders an empty item list as the placeholder fallback (length 0 → 4 dots)', () => {
    const { container } = render(<DockStage edge="bottom" items={[]} />);
    const slots = container.querySelectorAll('span.rounded-full');
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });
});
