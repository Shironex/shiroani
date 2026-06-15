import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import BrowserSection from './BrowserSection';

// Capture pristine actions so a test that stubs one with vi.fn() doesn't leak
// the stub into the next test through the shared store singleton.
const realBrowserActions = {
  setAdblockEnabled: useBrowserStore.getState().setAdblockEnabled,
  setPopupBlockEnabled: useBrowserStore.getState().setPopupBlockEnabled,
  setRestoreTabsOnStartup: useBrowserStore.getState().setRestoreTabsOnStartup,
  setSplitTabsEnabled: useBrowserStore.getState().setSplitTabsEnabled,
  addAdblockDomain: useBrowserStore.getState().addAdblockDomain,
  removeAdblockDomain: useBrowserStore.getState().removeAdblockDomain,
};
const realQuickActions = {
  setTrackFrequentSites: useQuickAccessStore.getState().setTrackFrequentSites,
};
const realSettingsActions = {
  setAutoTrackProgress: useSettingsStore.getState().setAutoTrackProgress,
};

function seedStores(
  browser: Partial<ReturnType<typeof useBrowserStore.getState>> = {},
  quick: Partial<ReturnType<typeof useQuickAccessStore.getState>> = {},
  settings: Partial<ReturnType<typeof useSettingsStore.getState>> = {}
) {
  useBrowserStore.setState({
    adblockEnabled: true,
    popupBlockEnabled: true,
    adblockWhitelist: [],
    restoreTabsOnStartup: true,
    splitTabsEnabled: true,
    ...realBrowserActions,
    ...browser,
  });
  useQuickAccessStore.setState({ trackFrequentSites: true, ...realQuickActions, ...quick });
  useSettingsStore.setState({ autoTrackProgress: true, ...realSettingsActions, ...settings });
}

describe('BrowserSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedStores();
  });

  afterEach(() => {
    seedStores();
    vi.clearAllMocks();
  });

  it('renders the ad-blocking card title', () => {
    render(<BrowserSection />);
    expect(screen.getByText('Ad blocking')).toBeInTheDocument();
  });

  it('reflects the blocked categories when adblock is on', () => {
    seedStores({ adblockEnabled: true });
    render(<BrowserSection />);
    expect(screen.getAllByText('Blocked')).toHaveLength(3);
  });

  it('shows the categories as disabled when adblock is off', () => {
    seedStores({ adblockEnabled: false });
    render(<BrowserSection />);
    expect(screen.getAllByText('Disabled')).toHaveLength(3);
  });

  it('drives every toggle through its store action', async () => {
    const setAdblockEnabled = vi.fn();
    const setPopupBlockEnabled = vi.fn();
    const setRestoreTabsOnStartup = vi.fn();
    const setSplitTabsEnabled = vi.fn();
    const setTrackFrequentSites = vi.fn();
    const setAutoTrackProgress = vi.fn();
    seedStores(
      { setAdblockEnabled, setPopupBlockEnabled, setRestoreTabsOnStartup, setSplitTabsEnabled },
      { setTrackFrequentSites },
      { setAutoTrackProgress }
    );
    const { user } = render(<BrowserSection />);

    await user.click(screen.getByRole('switch', { name: /Block ads/i }));
    expect(setAdblockEnabled).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Block pop-ups/i }));
    expect(setPopupBlockEnabled).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Restore tabs after restart/i }));
    expect(setRestoreTabsOnStartup).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Split tabs/i }));
    expect(setSplitTabsEnabled).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Save browsing history/i }));
    expect(setTrackFrequentSites).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole('switch', { name: /Automatic episode tracking/i }));
    expect(setAutoTrackProgress).toHaveBeenCalledWith(false);
  });

  it('shows the empty-exceptions message with no whitelist entries', () => {
    render(<BrowserSection />);
    expect(screen.getByText('No exceptions. Ads are blocked on every site.')).toBeInTheDocument();
  });

  it('renders each whitelisted domain with a labelled remove button', () => {
    seedStores({ adblockWhitelist: ['example.com', 'foo.test'] });
    render(<BrowserSection />);
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove example.com from exceptions list' })
    ).toBeInTheDocument();
  });

  it('disables the Add button until the input has content', async () => {
    const { user } = render(<BrowserSection />);
    const addButton = screen.getByRole('button', { name: 'Add' });
    expect(addButton).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Add domain to exceptions list' }), 'x.io');
    expect(addButton).toBeEnabled();
  });

  it('adds a domain via the Add button and clears the input', async () => {
    const addAdblockDomain = vi.fn();
    seedStores({ addAdblockDomain });
    const { user } = render(<BrowserSection />);
    const input = screen.getByRole('textbox', { name: 'Add domain to exceptions list' });
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(addAdblockDomain).toHaveBeenCalledWith('example.com');
    expect(input).toHaveValue('');
  });

  it('adds a domain when Enter is pressed in the input', async () => {
    const addAdblockDomain = vi.fn();
    seedStores({ addAdblockDomain });
    const { user } = render(<BrowserSection />);
    const input = screen.getByRole('textbox', { name: 'Add domain to exceptions list' });
    await user.type(input, 'foo.test{Enter}');
    expect(addAdblockDomain).toHaveBeenCalledWith('foo.test');
  });

  it('ignores a whitespace-only entry', async () => {
    const addAdblockDomain = vi.fn();
    seedStores({ addAdblockDomain });
    const { user } = render(<BrowserSection />);
    const input = screen.getByRole('textbox', { name: 'Add domain to exceptions list' });
    await user.type(input, '   {Enter}');
    expect(addAdblockDomain).not.toHaveBeenCalled();
  });

  it('removes a domain from the whitelist', async () => {
    const removeAdblockDomain = vi.fn();
    seedStores({ adblockWhitelist: ['example.com'], removeAdblockDomain });
    const { user } = render(<BrowserSection />);
    const list = screen.getByRole('list', { name: 'Exception domains list' });
    await user.click(
      within(list).getByRole('button', { name: 'Remove example.com from exceptions list' })
    );
    expect(removeAdblockDomain).toHaveBeenCalledWith('example.com');
  });
});
