import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { DEFAULT_DISCORD_TEMPLATES, type DiscordRpcSettings } from '@shiroani/shared';
import i18n from '@/lib/i18n';
import { DiscordSection } from '@/components/settings/DiscordSection';

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
 * The section reads its RPC settings and status from the electron bridge via
 * IPC on mount. The stub controls both reads so `settings` hydrates and the
 * section renders deterministically; `onStatusChanged` returns a no-op
 * unsubscribe so the effect cleanup is well-formed.
 */
function setBridge(opts?: {
  settings?: DiscordRpcSettings;
  status?: 'connected' | 'connecting' | 'disconnected' | 'error';
  updateSettings?: ReturnType<typeof vi.fn>;
}) {
  const updateSettings = opts?.updateSettings ?? vi.fn(async (s: DiscordRpcSettings) => s);
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    discordRpc: {
      getSettings: vi.fn(async () => opts?.settings ?? makeSettings()),
      updateSettings,
      getStatus: vi.fn(async () => opts?.status ?? 'connected'),
      onStatusChanged: vi.fn(() => vi.fn()),
    },
  };
  return { updateSettings };
}

describe('DiscordSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    vi.restoreAllMocks();
  });

  it('renders a loading skeleton until settings hydrate from the bridge', () => {
    // Without electronAPI, the section never hydrates settings and shows the
    // shared loading skeleton (instead of blanking the panel to null).
    const { container } = render(<DiscordSection />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows the connection status pill when enabled', async () => {
    setBridge({ status: 'connected' });
    render(<DiscordSection />);
    expect(await screen.findByText('Connected')).toBeInTheDocument();
  });

  it('hides the status pill when disabled', async () => {
    setBridge({ settings: makeSettings({ enabled: false }) });
    render(<DiscordSection />);
    // The enable toggle still renders, so wait on it before asserting absence.
    await screen.findByRole('switch', { name: 'Enable Discord Rich Presence' });
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('reflects the enabled state on the enable switch', async () => {
    setBridge({ settings: makeSettings({ enabled: true }) });
    render(<DiscordSection />);
    const toggle = await screen.findByRole('switch', { name: 'Enable Discord Rich Presence' });
    expect(toggle).toBeChecked();
  });

  it('toggling enable flips the switch state', async () => {
    setBridge({ settings: makeSettings({ enabled: false }) });
    const { user } = render(<DiscordSection />);
    const toggle = await screen.findByRole('switch', { name: 'Enable Discord Rich Presence' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('disables the detail and time toggles when not enabled', async () => {
    setBridge({ settings: makeSettings({ enabled: false }) });
    render(<DiscordSection />);
    const detail = await screen.findByRole('switch', { name: 'Show anime titles' });
    const time = screen.getByRole('switch', { name: 'Show elapsed time' });
    const templates = screen.getByRole('switch', { name: 'Custom templates' });
    expect(detail).toBeDisabled();
    expect(time).toBeDisabled();
    expect(templates).toBeDisabled();
  });

  it('enables the detail and time toggles when enabled', async () => {
    setBridge({ settings: makeSettings({ enabled: true }) });
    render(<DiscordSection />);
    const detail = await screen.findByRole('switch', { name: 'Show anime titles' });
    expect(detail).toBeEnabled();
  });

  it('hides the detail and time toggles when custom templates are on', async () => {
    setBridge({ settings: makeSettings({ enabled: true, useCustomTemplates: true }) });
    render(<DiscordSection />);
    // The custom-template toggle still renders; wait on it before asserting absence.
    await screen.findByRole('switch', { name: 'Custom templates' });
    expect(screen.queryByRole('switch', { name: 'Show anime titles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Show elapsed time' })).not.toBeInTheDocument();
  });

  it('toggling show-details reflects on the switch', async () => {
    setBridge({ settings: makeSettings({ enabled: true, showAnimeDetails: false }) });
    const { user } = render(<DiscordSection />);
    const detail = await screen.findByRole('switch', { name: 'Show anime titles' });
    expect(detail).not.toBeChecked();
    await user.click(detail);
    await waitFor(() => expect(detail).toBeChecked());
  });

  it('renders the preview and editor columns when custom templates are enabled', async () => {
    setBridge({ settings: makeSettings({ enabled: true, useCustomTemplates: true }) });
    render(<DiscordSection />);
    // Preview card title and editor card title both surface only in the
    // two-column layout that custom templates unlock.
    expect(await screen.findByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Status templates' })).toBeInTheDocument();
  });

  it('omits the preview and editor when custom templates are off', async () => {
    setBridge({ settings: makeSettings({ enabled: true, useCustomTemplates: false }) });
    render(<DiscordSection />);
    await screen.findByRole('switch', { name: 'Enable Discord Rich Presence' });
    expect(screen.queryByRole('heading', { name: 'Preview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Status templates' })).not.toBeInTheDocument();
  });

  it('auto-saves on change and flashes the saved indicator', async () => {
    const { updateSettings } = setBridge({ settings: makeSettings({ enabled: true }) });
    const { user } = render(<DiscordSection />);
    // Changing any field persists immediately — no explicit Save button.
    const detail = await screen.findByRole('switch', { name: 'Show anime titles' });
    await user.click(detail);

    expect(updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ showAnimeDetails: false, useCustomTemplates: false })
    );
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('reset restores the active template field to its default copy', async () => {
    const custom = makeSettings({
      enabled: true,
      useCustomTemplates: true,
      templates: {
        ...DEFAULT_DISCORD_TEMPLATES,
        watching: {
          ...DEFAULT_DISCORD_TEMPLATES.watching,
          details: 'My custom line',
        },
      },
    });
    setBridge({ settings: custom });
    const { user } = render(<DiscordSection />);

    // The editor's line-1 input holds the customized value.
    const line1 = await screen.findByDisplayValue('My custom line');
    expect(line1).toBeInTheDocument();

    const reset = screen.getByRole('button', { name: 'Restore defaults' });
    await user.click(reset);

    // The default watching line is resolved to its English copy on reset.
    await waitFor(() => expect(screen.getByDisplayValue('Watching anime')).toBeInTheDocument());
    expect(screen.queryByDisplayValue('My custom line')).not.toBeInTheDocument();
  });
});
