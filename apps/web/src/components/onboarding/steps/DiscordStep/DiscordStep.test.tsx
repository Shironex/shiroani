import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiscordStep from './DiscordStep';

describe('DiscordStep', () => {
  it('renders the Rich Presence title and toggle', () => {
    render(<DiscordStep />);

    expect(screen.getByRole('heading', { name: 'Rich Presence' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enable integration' })).toBeInTheDocument();
  });

  it('defaults to enabled and previews the "watching" card', () => {
    render(<DiscordStep />);

    // Local enabled state defaults to true, so the preview shows the example.
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('Watching anime')).toBeInTheDocument();
    expect(screen.getByText("Frieren: Beyond Journey's End")).toBeInTheDocument();
  });

  it('disables the toggle and shows a desktop-only notice off-Electron', () => {
    // No window.electronAPI in the renderer, so IS_ELECTRON is false.
    render(<DiscordStep />);

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('Desktop-only feature')).toBeInTheDocument();
  });
});
