import { render, screen, act } from '@/test/test-utils';
import { vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { useDockStore } from '@/stores/useDockStore';
import { NavigationDock } from '@/components/shared/NavigationDock';

vi.mock('@/lib/platform', () => ({ IS_ELECTRON: false }));

// Tests boot i18n in EN (DEFAULT_LANGUAGE) — labels mirror the resolved
// `nav:link.<id>` keys from `apps/web/src/locales/en/nav.json`.
const NAV_ITEMS = [
  { id: 'browser', label: 'Browser' },
  { id: 'library', label: 'Library' },
  { id: 'diary', label: 'Diary' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'feed', label: 'News' },
  { id: 'settings', label: 'Settings' },
] as const;

beforeEach(() => {
  useAppStore.setState({ activeView: 'browser' });
  useDockStore.setState({
    edge: 'bottom',
    offset: 50,
    autoHide: false,
    draggable: true,
    showLabels: true,
    isDragging: false,
    dragPosition: null,
    isExpanded: false,
    initialized: true,
  });
});

describe('NavigationDock', () => {
  it('renders all navigation items with correct labels', () => {
    render(<NavigationDock hasBg={false} />);

    for (const { label } of NAV_ITEMS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders all items as accessible buttons with aria-label', () => {
    render(<NavigationDock hasBg={false} />);

    for (const { label } of NAV_ITEMS) {
      const button = screen.getByRole('button', { name: label });
      expect(button).toBeInTheDocument();
    }
  });

  it('marks the active view with aria-current="page"', () => {
    useAppStore.setState({ activeView: 'library' });
    render(<NavigationDock hasBg={false} />);

    const activeButton = screen.getByRole('button', { name: 'Library' });
    expect(activeButton).toHaveAttribute('aria-current', 'page');

    // Other buttons should not have aria-current
    for (const { label } of NAV_ITEMS) {
      if (label === 'Library') continue;
      const button = screen.getByRole('button', { name: label });
      expect(button).not.toHaveAttribute('aria-current');
    }
  });

  it('calls navigateTo with the correct view id when clicking a nav item', async () => {
    const navigateTo = vi.fn();
    useAppStore.setState({ activeView: 'browser', navigateTo });

    const { user } = render(<NavigationDock hasBg={false} />);

    await user.click(screen.getByRole('button', { name: 'Diary' }));
    expect(navigateTo).toHaveBeenCalledWith('diary');

    await user.click(screen.getByRole('button', { name: 'Schedule' }));
    expect(navigateTo).toHaveBeenCalledWith('schedule');

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(navigateTo).toHaveBeenCalledWith('settings');
  });

  it('has a nav landmark with the correct accessible name', () => {
    render(<NavigationDock hasBg={false} />);

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeInTheDocument();
  });

  it('reflects activeView changes across different views', () => {
    render(<NavigationDock hasBg={false} />);

    // Default: browser is active
    expect(screen.getByRole('button', { name: 'Browser' })).toHaveAttribute('aria-current', 'page');

    // Change to settings
    act(() => {
      useAppStore.setState({ activeView: 'settings' });
    });

    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('button', { name: 'Browser' })).not.toHaveAttribute('aria-current');
  });

  it('shows collapsed logo when autoHide is enabled', () => {
    useDockStore.setState({ autoHide: true, isExpanded: false });
    render(<NavigationDock hasBg={false} />);

    // Should show the logo image but not nav buttons
    expect(screen.getByAltText('ShiroAni')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browser' })).not.toBeInTheDocument();
  });

  it('renders vertically when edge is left or right', () => {
    useDockStore.setState({ edge: 'left' });
    render(<NavigationDock hasBg={false} />);

    // All items should still render
    for (const { label } of NAV_ITEMS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('hides labels in icon-only mode', () => {
    useDockStore.setState({ showLabels: false });
    render(<NavigationDock hasBg={false} />);

    // Buttons should exist (via aria-label) but label text should not be visible
    for (const { label } of NAV_ITEMS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it('renders drag handle when draggable=true', () => {
    useDockStore.setState({ draggable: true });
    render(<NavigationDock hasBg={false} />);

    const handle = screen.getByRole('button', { name: 'Move dock' });
    expect(handle).toBeInTheDocument();
  });

  it('does not render drag handle when draggable=false', () => {
    useDockStore.setState({ draggable: false });
    render(<NavigationDock hasBg={false} />);

    expect(screen.queryByRole('button', { name: 'Move dock' })).not.toBeInTheDocument();
  });

  it('clicking a nav item does not set isDragging', async () => {
    useDockStore.setState({ draggable: true, isDragging: false });
    const { user } = render(<NavigationDock hasBg={false} />);

    await user.click(screen.getByRole('button', { name: 'Diary' }));

    expect(useDockStore.getState().isDragging).toBe(false);
  });

  it('collapsed-mode logo is a button that calls setExpanded', async () => {
    const setExpanded = vi.fn();
    useDockStore.setState({ autoHide: true, isExpanded: false, setExpanded });
    const { user } = render(<NavigationDock hasBg={false} />);

    const logoButton = screen.getByRole('button', { name: 'Expand navigation' });
    expect(logoButton).toBeInTheDocument();

    await user.click(logoButton);
    expect(setExpanded).toHaveBeenCalledWith(true);
  });
});
