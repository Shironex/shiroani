import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useDockStore } from '@/stores/useDockStore';
import i18n from '@/lib/i18n';
import { DockSection } from '.';

function seedDock(overrides?: Partial<ReturnType<typeof useDockStore.getState>>) {
  useDockStore.setState({
    edge: 'bottom',
    autoHide: false,
    showLabels: true,
    draggable: true,
    setEdge: vi.fn(),
    setAutoHide: vi.fn(),
    setShowLabels: vi.fn(),
    setDraggable: vi.fn(),
    resetPosition: vi.fn(),
    ...overrides,
  });
}

describe('DockSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedDock();
  });

  afterEach(() => {
    seedDock();
  });

  it('renders the dock position and behaviour cards', () => {
    render(<DockSection />);
    expect(screen.getByText('Dock position')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Dock edge' })).toBeInTheDocument();
  });

  it('marks the active edge radio as checked from the store', () => {
    seedDock({ edge: 'left' });
    render(<DockSection />);
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Bottom' })).toHaveAttribute('aria-checked', 'false');
  });

  it('choosing a different edge calls setEdge with that edge', async () => {
    const setEdge = vi.fn();
    seedDock({ setEdge });
    const { user } = render(<DockSection />);
    await user.click(screen.getByRole('radio', { name: 'Top' }));
    expect(setEdge).toHaveBeenCalledWith('top');
  });

  it('reset position button calls resetPosition', async () => {
    const resetPosition = vi.fn();
    seedDock({ resetPosition });
    const { user } = render(<DockSection />);
    await user.click(screen.getByRole('button', { name: 'Reset position' }));
    expect(resetPosition).toHaveBeenCalledOnce();
  });

  it('reflects the auto-hide / show-labels / draggable toggle states from the store', () => {
    seedDock({ autoHide: true, showLabels: false, draggable: true });
    render(<DockSection />);
    expect(screen.getByRole('switch', { name: 'Auto-hide' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Show labels' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Draggable' })).toBeChecked();
  });

  it('toggling auto-hide calls setAutoHide with the next value', async () => {
    const setAutoHide = vi.fn();
    seedDock({ autoHide: false, setAutoHide });
    const { user } = render(<DockSection />);
    await user.click(screen.getByRole('switch', { name: 'Auto-hide' }));
    expect(setAutoHide).toHaveBeenCalledWith(true);
  });

  it('toggling show-labels calls setShowLabels with the next value', async () => {
    const setShowLabels = vi.fn();
    seedDock({ showLabels: true, setShowLabels });
    const { user } = render(<DockSection />);
    await user.click(screen.getByRole('switch', { name: 'Show labels' }));
    expect(setShowLabels).toHaveBeenCalledWith(false);
  });

  it('toggling draggable calls setDraggable with the next value', async () => {
    const setDraggable = vi.fn();
    seedDock({ draggable: false, setDraggable });
    const { user } = render(<DockSection />);
    await user.click(screen.getByRole('switch', { name: 'Draggable' }));
    expect(setDraggable).toHaveBeenCalledWith(true);
  });

  it('renders the dock preview stage labelled "Preview"', () => {
    render(<DockSection />);
    // The position card embeds a DockStage labelled "Preview".
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
