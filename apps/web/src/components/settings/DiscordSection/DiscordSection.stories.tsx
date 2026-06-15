import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { DEFAULT_DISCORD_TEMPLATES, type DiscordRpcSettings } from '@shiroani/shared';
import DiscordSection from './DiscordSection';

function makeSettings(overrides?: Partial<DiscordRpcSettings>): DiscordRpcSettings {
  return {
    enabled: true,
    showAnimeDetails: true,
    showElapsedTime: true,
    useCustomTemplates: false,
    templates: DEFAULT_DISCORD_TEMPLATES,
    ...overrides,
  };
}

/**
 * Installs a fake Electron bridge on `window` so the section's mount effects
 * hydrate RPC settings + status over IPC (no socket involved) and render. The
 * `updateSettings` action is a `fn()` spy stories assert against; this is a real
 * browser global (not a Vitest mock), so it works in the addon-vitest run.
 */
function stubDiscordBridge(opts?: {
  settings?: DiscordRpcSettings;
  status?: 'connected' | 'connecting' | 'disconnected' | 'error';
}) {
  const win = window as unknown as { electronAPI?: unknown };
  const prev = win.electronAPI;
  const updateSettings = fn(async (s: DiscordRpcSettings) => s).mockName('updateSettings');
  win.electronAPI = {
    discordRpc: {
      getSettings: async () => opts?.settings ?? makeSettings(),
      updateSettings,
      getStatus: async () => opts?.status ?? 'connected',
      onStatusChanged: () => () => {},
    },
  };
  return { updateSettings, restore: () => void (win.electronAPI = prev) };
}

/**
 * Discord Rich Presence settings surface. Hydrates RPC settings + live
 * connection status from the Electron bridge on mount and returns nothing until
 * they load. With presence enabled it shows the status pill, the
 * show-details / show-time / custom-templates toggles, and a Save button;
 * enabling custom templates swaps to a two-column layout with a live preview
 * and the template editor.
 */
const meta = {
  title: 'settings/DiscordSection',
  component: DiscordSection,
  parameters: {
    layout: 'padded',
    // Status pill and enable Switch carry aria-labels; SettingsCard rows wire
    // aria-labelledby, so the rendered surface passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiscordSection>;

export default meta;

type Story = StoryObj<typeof DiscordSection>;

/** Connected, default layout — toggle enable off then back on, then Save. */
export const Enabled: Story = {
  beforeEach: () => {
    const { restore } = stubDiscordBridge({ status: 'connected' });
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The status pill confirms the section hydrated with presence enabled.
    await expect(await canvas.findByText('Connected')).toBeInTheDocument();
    const enable = canvas.getByRole('switch', { name: 'Enable Discord Rich Presence' });
    await expect(enable).toBeChecked();

    // Clicking Save flips the button into its saved state.
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Saved' })).toBeInTheDocument());
  },
};

/** Disabled — no status pill, and the detail toggles are non-interactive. */
export const Disabled: Story = {
  beforeEach: () => {
    const { restore } = stubDiscordBridge({ settings: makeSettings({ enabled: false }) });
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const enable = await canvas.findByRole('switch', { name: 'Enable Discord Rich Presence' });
    await expect(enable).not.toBeChecked();
    await expect(canvas.queryByText('Connected')).not.toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Show anime titles' })).toBeDisabled();
  },
};

/** Custom templates on — the two-column preview + editor layout is shown. */
export const CustomTemplates: Story = {
  beforeEach: () => {
    const { restore } = stubDiscordBridge({
      settings: makeSettings({ enabled: true, useCustomTemplates: true }),
    });
    return restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Status templates' })).toBeInTheDocument();
  },
};
