import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useSettingsStore } from '@/stores/useSettingsStore';
import ThemeStep from './ThemeStep';

beforeEach(() => {
  useSettingsStore.setState({ theme: 'plum' });
});

describe('ThemeStep', () => {
  it('renders the dark and light theme groups', () => {
    render(<ThemeStep />);

    expect(screen.getByRole('heading', { name: 'Themes' })).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('marks the stored theme as the pressed swatch', () => {
    useSettingsStore.setState({ theme: 'matcha' });
    render(<ThemeStep />);

    expect(screen.getByRole('button', { name: 'Matcha', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plum', pressed: false })).toBeInTheDocument();
  });

  it('commits a theme selection to the settings store on click', async () => {
    const setTheme = vi.fn();
    useSettingsStore.setState({ setTheme });
    const { user } = render(<ThemeStep />);

    await user.click(screen.getByRole('button', { name: 'Matcha' }));

    expect(setTheme).toHaveBeenCalledWith('matcha');
  });

  it('previews a theme on hover and clears the preview on leave', async () => {
    const setPreviewTheme = vi.fn();
    useSettingsStore.setState({ setPreviewTheme });
    const { user } = render(<ThemeStep />);

    const swatch = screen.getByRole('button', { name: 'Paper' });
    await user.hover(swatch);
    expect(setPreviewTheme).toHaveBeenCalledWith('paper');

    await user.unhover(swatch);
    // clearPreview() calls setPreviewTheme(null).
    expect(setPreviewTheme).toHaveBeenLastCalledWith(null);
  });
});
