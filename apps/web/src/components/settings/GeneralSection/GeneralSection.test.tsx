import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { FEED_STARTUP_REFRESH_SETTING_KEY } from '@shiroani/shared';
import { useSettingsStore } from '@/stores/useSettingsStore';
import i18n from '@/lib/i18n';
import { GeneralSection } from '.';

const mocks = vi.hoisted(() => ({
  persistLanguage: vi.fn(),
}));

vi.mock('@/lib/i18n', async () => {
  const actual = await vi.importActual<typeof import('@/lib/i18n')>('@/lib/i18n');
  return {
    ...actual,
    persistLanguage: mocks.persistLanguage,
  };
});

/**
 * The section reads the auto-launch flag and the feed-startup-refresh flag from
 * the electron bridge on mount. The stub controls both reads so `loaded` flips
 * true and the section renders its toggles deterministically.
 */
function setBridge(opts?: {
  autoLaunch?: boolean;
  setAutoLaunch?: (enabled: boolean) => Promise<boolean> | boolean;
  startupRefresh?: boolean;
  storeSet?: (key: string, value: unknown) => Promise<void>;
}) {
  const setAutoLaunch = opts?.setAutoLaunch ?? vi.fn(async (enabled: boolean) => enabled);
  const storeSet = opts?.storeSet ?? vi.fn(async () => {});
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    app: {
      getAutoLaunch: vi.fn(async () => opts?.autoLaunch ?? false),
      setAutoLaunch,
    },
    store: {
      get: vi.fn(async () => opts?.startupRefresh ?? false),
      set: storeSet,
    },
  };
  return { setAutoLaunch, storeSet };
}

describe('GeneralSection — language picker', () => {
  beforeEach(async () => {
    mocks.persistLanguage.mockReset();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    await i18n.changeLanguage('en');
  });

  it('renders both supported languages as buttons', async () => {
    render(<GeneralSection />);
    expect(await screen.findByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Polski' })).toBeInTheDocument();
  });

  it('switching to Polski calls persistLanguage and changes i18n.language', async () => {
    const { user } = render(<GeneralSection />);
    const plButton = await screen.findByRole('button', { name: 'Polski' });
    await user.click(plButton);

    await waitFor(() => {
      expect(i18n.language).toBe('pl');
    });
    expect(mocks.persistLanguage).toHaveBeenCalledWith('pl');
  });

  it('switching back to English persists en and re-renders translated copy', async () => {
    await i18n.changeLanguage('pl');
    const { user } = render(<GeneralSection />);
    const enButton = await screen.findByRole('button', { name: 'English' });
    await user.click(enButton);

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
    expect(mocks.persistLanguage).toHaveBeenCalledWith('en');
    // The card title comes from settings:app.languageTitle and should now
    // resolve in EN. Polish would render "Język", English "Language".
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('marks the active language button with the selected styling state', async () => {
    render(<GeneralSection />);
    const enButton = await screen.findByRole('button', { name: 'English' });
    // The active language carries the primary accent border classes.
    expect(enButton.className).toContain('border-primary/35');
    expect(screen.getByRole('button', { name: 'Polski' }).className).not.toContain(
      'border-primary/35'
    );
  });
});

describe('GeneralSection — display name', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useSettingsStore.setState({ displayName: '' });
  });

  afterEach(async () => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    useSettingsStore.setState({ displayName: '' });
    await i18n.changeLanguage('en');
  });

  it('reflects the current display name from the settings store', async () => {
    useSettingsStore.setState({ displayName: 'Anya' });
    render(<GeneralSection />);
    const input = await screen.findByRole('textbox', { name: 'Your name' });
    expect((input as HTMLInputElement).value).toBe('Anya');
  });

  it('typing into the name field calls setDisplayName', async () => {
    const setDisplayName = vi.fn();
    useSettingsStore.setState({ displayName: '', setDisplayName });
    const { user } = render(<GeneralSection />);
    const input = await screen.findByRole('textbox', { name: 'Your name' });
    await user.type(input, 'A');
    expect(setDisplayName).toHaveBeenCalledWith('A');
  });
});

describe('GeneralSection — app toggles', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    vi.restoreAllMocks();
    await i18n.changeLanguage('en');
  });

  it('reflects the persisted auto-launch and feed-refresh flags once loaded', async () => {
    setBridge({ autoLaunch: true, startupRefresh: true });
    render(<GeneralSection />);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Launch at system startup' })).toBeChecked()
    );
    expect(screen.getByRole('switch', { name: 'Refresh RSS at app startup' })).toBeChecked();
  });

  it('toggling auto-launch calls the bridge setAutoLaunch with the new value', async () => {
    const { setAutoLaunch } = setBridge({ autoLaunch: false });
    const { user } = render(<GeneralSection />);
    const toggle = await screen.findByRole('switch', { name: 'Launch at system startup' });
    await user.click(toggle);
    expect(setAutoLaunch).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('toggling feed-refresh persists the new value via the electron store', async () => {
    const { storeSet } = setBridge({ startupRefresh: false });
    const { user } = render(<GeneralSection />);
    const toggle = await screen.findByRole('switch', { name: 'Refresh RSS at app startup' });
    await user.click(toggle);
    expect(storeSet).toHaveBeenCalledWith(FEED_STARTUP_REFRESH_SETTING_KEY, true);
    await waitFor(() => expect(toggle).toBeChecked());
  });
});
