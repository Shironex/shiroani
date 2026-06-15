import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { DeveloperSection } from '.';
import { useSettingsStore } from '@/stores/useSettingsStore';

const mocks = vi.hoisted(() => ({ copyDiagnosticsToClipboard: vi.fn() }));
vi.mock('@/lib/diagnostics', () => ({
  copyDiagnosticsToClipboard: mocks.copyDiagnosticsToClipboard,
}));

describe('DeveloperSection', () => {
  beforeEach(async () => {
    mocks.copyDiagnosticsToClipboard.mockReset().mockResolvedValue(true);
    useSettingsStore.setState({ devModeEnabled: false });
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    useSettingsStore.setState({ devModeEnabled: false });
  });

  it('renders the developer tools card', () => {
    expect(() => render(<DeveloperSection />)).not.toThrow();
  });

  it('reflects the store toggle state', () => {
    useSettingsStore.setState({ devModeEnabled: true });
    render(<DeveloperSection />);
    expect(screen.getByRole('switch', { name: 'Enable developer mode' })).toBeChecked();
  });

  it('hides the dev tool buttons while developer mode is off', () => {
    render(<DeveloperSection />);
    expect(screen.queryByRole('button', { name: 'DevTools' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show logs' })).not.toBeInTheDocument();
  });

  it('toggles developer mode through the settings store', async () => {
    const { user } = render(<DeveloperSection />);
    await user.click(screen.getByRole('switch', { name: 'Enable developer mode' }));
    expect(useSettingsStore.getState().devModeEnabled).toBe(true);
  });

  it('reveals the dev tool buttons once developer mode is on', () => {
    useSettingsStore.setState({ devModeEnabled: true });
    render(<DeveloperSection />);
    expect(screen.getByRole('button', { name: 'DevTools' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy diagnostics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show logs' })).toBeInTheDocument();
  });

  it('copies diagnostics and reflects the copied state', async () => {
    useSettingsStore.setState({ devModeEnabled: true });
    const { user } = render(<DeveloperSection />);
    await user.click(screen.getByRole('button', { name: 'Copy diagnostics' }));
    expect(mocks.copyDiagnosticsToClipboard).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('opens the log viewer dialog from the show-logs button', async () => {
    useSettingsStore.setState({ devModeEnabled: true });
    const { user } = render(<DeveloperSection />);
    await user.click(screen.getByRole('button', { name: 'Show logs' }));
    expect(await screen.findByText('Log viewer')).toBeInTheDocument();
  });
});
