import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import BrowserSection from './BrowserSection';

/** Seed the three backing stores to a deterministic baseline before each story. */
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
    ...browser,
  });
  useQuickAccessStore.setState({ trackFrequentSites: true, ...quick });
  useSettingsStore.setState({ autoTrackProgress: true, ...settings });
}

/**
 * Browser settings surface — five glass cards covering ad blocking (with a
 * domain-exception editor), pop-up blocking, tab behaviour (restore / split /
 * history), automatic progress tracking and a general info note. Toggles read
 * and write the `BrowserStore`, `QuickAccessStore` and `SettingsStore`, which
 * each story seeds in `beforeEach`. Outside Electron the store writes no-op, so
 * the section is fully interactive in Storybook.
 */
const meta = {
  title: 'settings/BrowserSection',
  component: BrowserSection,
  parameters: {
    // Every switch is row-labelled, the domain input + remove buttons are named
    // and the lists carry aria-labels, so axe passes clean.
    a11y: { test: 'error' },
  },
  beforeEach: () => {
    seedStores();
  },
} satisfies Meta<typeof BrowserSection>;

export default meta;

type Story = StoryObj<typeof BrowserSection>;

/** Default mount — adblock on, every category chip shows Blocked. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ad blocking')).toBeInTheDocument();
    await expect(canvas.getAllByText('Blocked')).toHaveLength(3);
  },
};

/** Toggling adblock off flips the store flag and disables the category chips. */
export const ToggleAdblock: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('switch', { name: /Block ads/i }));
    await waitFor(() => expect(useBrowserStore.getState().adblockEnabled).toBe(false));
    await expect(canvas.getAllByText('Disabled')).toHaveLength(3);
  },
};

/** Adding a domain via the input writes a normalised host into the whitelist. */
export const AddException: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Add domain to exceptions list' });
    await userEvent.type(input, 'example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(useBrowserStore.getState().adblockWhitelist).toContain('example.com')
    );
    await expect(input).toHaveValue('');
  },
};

/** Removing a seeded exception drops it from the whitelist. */
export const RemoveException: Story = {
  beforeEach: () => {
    seedStores({ adblockWhitelist: ['example.com'] });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Remove example.com from exceptions list' })
    );
    await waitFor(() =>
      expect(useBrowserStore.getState().adblockWhitelist).not.toContain('example.com')
    );
  },
};

/** Several exceptions seeded — the list and counter render the entries. */
export const WithExceptions: Story = {
  beforeEach: () => {
    seedStores({ adblockWhitelist: ['example.com', 'foo.test', 'bar.io'] });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('example.com')).toBeInTheDocument();
    await expect(canvas.getByText('3 / 500')).toBeInTheDocument();
  },
};
