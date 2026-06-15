import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useDockStore } from '@/stores/useDockStore';
import { DEFAULT_VIEW_ORDER } from '@/lib/nav-items';
import i18n from '@/lib/i18n';
import ViewsSection from './ViewsSection';

function seedDock(overrides?: Partial<ReturnType<typeof useDockStore.getState>>) {
  useDockStore.setState({
    edge: 'bottom',
    order: DEFAULT_VIEW_ORDER,
    hiddenViews: [],
    toggleViewVisibility: vi.fn(),
    reorderViews: vi.fn(),
    resetViews: vi.fn(),
    ...overrides,
  });
}

describe('ViewsSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedDock();
  });

  afterEach(() => {
    seedDock();
  });

  it('renders the view visibility card title', () => {
    render(<ViewsSection />);
    expect(screen.getByText('View visibility')).toBeInTheDocument();
  });

  it('renders one visibility toggle per nav view, each labelled by its name', () => {
    render(<ViewsSection />);
    // Library is a regular toggleable view.
    expect(screen.getByRole('switch', { name: /Library/ })).toBeInTheDocument();
    // Settings is always visible.
    expect(screen.getByRole('switch', { name: /Settings/ })).toBeInTheDocument();
  });

  it('reflects a hidden view as an unchecked switch', () => {
    seedDock({ hiddenViews: ['feed'] });
    render(<ViewsSection />);
    expect(screen.getByRole('switch', { name: /News/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Library/ })).toBeChecked();
  });

  it('disables the always-on Settings view toggle and keeps it checked', () => {
    render(<ViewsSection />);
    const settingsSwitch = screen.getByRole('switch', { name: /Settings/ });
    expect(settingsSwitch).toBeDisabled();
    expect(settingsSwitch).toBeChecked();
    // The "always" tag is rendered next to the always-on view.
    expect(screen.getByText('(always)')).toBeInTheDocument();
  });

  it('toggling a regular view calls toggleViewVisibility with that view id', async () => {
    const toggleViewVisibility = vi.fn();
    seedDock({ toggleViewVisibility });
    const { user } = render(<ViewsSection />);
    await user.click(screen.getByRole('switch', { name: /Library/ }));
    expect(toggleViewVisibility).toHaveBeenCalledWith('library');
  });

  it('the reset action calls resetViews', async () => {
    const resetViews = vi.fn();
    seedDock({ resetViews });
    const { user } = render(<ViewsSection />);
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(resetViews).toHaveBeenCalledOnce();
  });

  it('renders a labelled drag handle for each reorderable row', () => {
    render(<ViewsSection />);
    expect(screen.getByRole('button', { name: 'Reorder Library' })).toBeInTheDocument();
  });

  it('renders the dock preview stage labelled "Preview"', () => {
    render(<ViewsSection />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
