import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useDockStore } from '@/stores/useDockStore';
import DockStep from './DockStep';

beforeEach(() => {
  useDockStore.setState({
    edge: 'bottom',
    autoHide: false,
    showLabels: true,
    draggable: false,
  });
});

describe('DockStep', () => {
  it('renders the dock title and the three preference toggles', () => {
    render(<DockStep />);

    expect(screen.getByRole('heading', { name: 'Dock' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });

  it('reflects the stored toggle and edge state', () => {
    useDockStore.setState({ edge: 'left', autoHide: true, showLabels: false });
    render(<DockStep />);

    expect(screen.getByRole('switch', { name: 'Auto-hide' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Show labels' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Left', checked: true })).toBeInTheDocument();
  });

  it('selects a new dock edge through the store', async () => {
    const setEdge = vi.fn();
    useDockStore.setState({ setEdge });
    const { user } = render(<DockStep />);

    await user.click(screen.getByRole('radio', { name: 'Right' }));

    expect(setEdge).toHaveBeenCalledWith('right');
  });

  it('flips each preference toggle through its store setter', async () => {
    const setAutoHide = vi.fn();
    const setShowLabels = vi.fn();
    const setDraggable = vi.fn();
    useDockStore.setState({ setAutoHide, setShowLabels, setDraggable });
    const { user } = render(<DockStep />);

    await user.click(screen.getByRole('switch', { name: 'Auto-hide' }));
    expect(setAutoHide).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole('switch', { name: 'Show labels' }));
    expect(setShowLabels).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('switch', { name: 'Draggable' }));
    expect(setDraggable).toHaveBeenCalledWith(true);
  });
});
