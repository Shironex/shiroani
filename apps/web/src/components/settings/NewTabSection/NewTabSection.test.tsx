import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import {
  useNewTabStore,
  AIRING_COUNT_MIN,
  AIRING_COUNT_MAX,
  type NewTabPanelId,
} from '@/stores/useNewTabStore';
import { NewTabSection } from '.';

const DEFAULT_ORDER: NewTabPanelId[] = ['greeting', 'airing', 'quickAccess', 'recents', 'resume'];

// Capture the pristine action set once so seedStore can restore any actions a
// previous test replaced with a vi.fn() stub.
const realActions = {
  togglePanel: useNewTabStore.getState().togglePanel,
  reorderPanels: useNewTabStore.getState().reorderPanels,
  setShowWatermark: useNewTabStore.getState().setShowWatermark,
  setShowGreetingName: useNewTabStore.getState().setShowGreetingName,
  setAiringCount: useNewTabStore.getState().setAiringCount,
  resetNewTab: useNewTabStore.getState().resetNewTab,
};

/** Reset the store to a known baseline before each test. */
function seedStore(overrides: Partial<ReturnType<typeof useNewTabStore.getState>> = {}) {
  useNewTabStore.setState({
    order: DEFAULT_ORDER,
    hiddenPanels: [],
    showWatermark: true,
    showGreetingName: true,
    airingCount: 12,
    ...realActions,
    ...overrides,
  });
}

describe('NewTabSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedStore();
  });

  afterEach(() => {
    seedStore();
    vi.clearAllMocks();
  });

  it('renders the new-tab customisation card', () => {
    expect(() => render(<NewTabSection />)).not.toThrow();
    expect(screen.getByText('New tab page')).toBeInTheDocument();
  });

  it('renders a switch per panel reflecting its visibility', () => {
    seedStore({ hiddenPanels: ['recents'] });
    render(<NewTabSection />);
    expect(screen.getByRole('switch', { name: 'Greeting' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Recently visited' })).not.toBeChecked();
  });

  it('toggles a panel through the store action', async () => {
    const togglePanel = vi.fn();
    seedStore({ togglePanel });
    const { user } = render(<NewTabSection />);
    await user.click(screen.getByRole('switch', { name: 'Quick access' }));
    expect(togglePanel).toHaveBeenCalledWith('quickAccess');
  });

  it('drives the watermark and greeting-name toggles', async () => {
    const setShowWatermark = vi.fn();
    const setShowGreetingName = vi.fn();
    seedStore({ setShowWatermark, setShowGreetingName });
    const { user } = render(<NewTabSection />);
    await user.click(screen.getByRole('switch', { name: /Kanji watermark/i }));
    expect(setShowWatermark).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Show name in greeting/i }));
    expect(setShowGreetingName).toHaveBeenCalledWith(false);
  });

  it('shows the current airing count and its clamp bounds', () => {
    seedStore({ airingCount: 9 });
    render(<NewTabSection />);
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText(String(AIRING_COUNT_MIN))).toBeInTheDocument();
    expect(screen.getByText(String(AIRING_COUNT_MAX))).toBeInTheDocument();
  });

  it('nudges the airing-count slider and passes the new value to the store', async () => {
    const setAiringCount = vi.fn();
    seedStore({ airingCount: 12, setAiringCount });
    const { user } = render(<NewTabSection />);
    const slider = screen.getByRole('slider', { name: 'Airing today card count' });
    slider.focus();
    await user.keyboard('{ArrowRight}');
    expect(setAiringCount).toHaveBeenCalledWith(13);
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(setAiringCount).toHaveBeenLastCalledWith(11);
  });

  it('clamps the airing count at the max via the store action', () => {
    seedStore();
    useNewTabStore.getState().setAiringCount(999);
    expect(useNewTabStore.getState().airingCount).toBe(AIRING_COUNT_MAX);
    useNewTabStore.getState().setAiringCount(0);
    expect(useNewTabStore.getState().airingCount).toBe(AIRING_COUNT_MIN);
  });

  it('resets the layout through the store action', async () => {
    const resetNewTab = vi.fn();
    seedStore({ resetNewTab });
    const { user } = render(<NewTabSection />);
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }));
    expect(resetNewTab).toHaveBeenCalled();
  });

  it('restores default order and visibility on reset', async () => {
    seedStore({ hiddenPanels: ['greeting', 'airing'], airingCount: 6 });
    render(<NewTabSection />);
    useNewTabStore.getState().resetNewTab();
    await waitFor(() => {
      const state = useNewTabStore.getState();
      expect(state.hiddenPanels).toEqual([]);
      expect(state.airingCount).toBe(12);
      expect(state.order).toEqual(DEFAULT_ORDER);
    });
  });
});
