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

const getLabel = (e: DockEdge) => LABELS[e];

describe('DockEdgePicker', () => {
  it('renders a radiogroup with one radio per edge and fires onSelect on click', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <DockEdgePicker
        value="bottom"
        onSelect={onSelect}
        getLabel={getLabel}
        ariaLabel="Dock edge"
      />
    );

    expect(screen.getByRole('radiogroup', { name: 'Dock edge' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);

    await user.click(screen.getByRole('radio', { name: 'Top' }));
    expect(onSelect).toHaveBeenCalledWith('top');
  });

  it('marks only the active edge as checked', () => {
    render(
      <DockEdgePicker value="left" onSelect={() => {}} getLabel={getLabel} ariaLabel="Dock edge" />
    );
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
    for (const name of ['Bottom', 'Top', 'Right']) {
      expect(screen.getByRole('radio', { name })).toHaveAttribute('aria-checked', 'false');
    }
  });

  it('keeps only the active radio in the tab order (roving tabindex)', () => {
    render(
      <DockEdgePicker value="right" onSelect={() => {}} getLabel={getLabel} ariaLabel="Dock edge" />
    );
    expect(screen.getByRole('radio', { name: 'Right' })).toHaveAttribute('tabindex', '0');
    for (const name of ['Bottom', 'Top', 'Left']) {
      expect(screen.getByRole('radio', { name })).toHaveAttribute('tabindex', '-1');
    }
  });

  it('moves selection forward with ArrowRight/ArrowDown (with wrap)', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <DockEdgePicker
        value="bottom"
        onSelect={onSelect}
        getLabel={getLabel}
        ariaLabel="Dock edge"
      />
    );
    const active = screen.getByRole('radio', { name: 'Bottom' });
    active.focus();

    // Edge order: bottom → top → left → right → bottom
    await user.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('top');

    await user.keyboard('{ArrowDown}');
    expect(onSelect).toHaveBeenLastCalledWith('top');
  });

  it('moves selection backward with ArrowLeft/ArrowUp and wraps past the first edge', async () => {
    const onSelect = vi.fn();
    const { user } = render(
      <DockEdgePicker
        value="bottom"
        onSelect={onSelect}
        getLabel={getLabel}
        ariaLabel="Dock edge"
      />
    );
    const active = screen.getByRole('radio', { name: 'Bottom' });
    active.focus();

    // bottom is index 0 — going backward wraps to 'right' (last edge).
    await user.keyboard('{ArrowLeft}');
    expect(onSelect).toHaveBeenLastCalledWith('right');

    await user.keyboard('{ArrowUp}');
    expect(onSelect).toHaveBeenLastCalledWith('right');
  });

  it('renders the illustrated variant with decorative glyphs and accessible labels', () => {
    render(
      <DockEdgePicker
        value="top"
        onSelect={() => {}}
        getLabel={getLabel}
        ariaLabel="Dock edge"
        variant="illustrated"
      />
    );
    // Labels still drive the accessible name; the glyph is aria-hidden decoration.
    expect(screen.getByRole('radio', { name: 'Top' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('resolves each label through the provided getLabel callback', () => {
    const getCustom = vi.fn((e: DockEdge) => `Edge: ${e}`);
    render(
      <DockEdgePicker
        value="bottom"
        onSelect={() => {}}
        getLabel={getCustom}
        ariaLabel="Dock edge"
      />
    );
    expect(getCustom).toHaveBeenCalledWith('bottom');
    expect(screen.getByRole('radio', { name: 'Edge: bottom' })).toBeInTheDocument();
  });
});
