import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CustomThemeDefinition } from '@shiroani/shared';
import { render, screen, waitFor } from '@/test/test-utils';
import { useSettingsStore, SYSTEM_THEME } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import i18n from '@/lib/i18n';
import { ThemesSection } from '.';

function makeCustomTheme(id: string, name: string): CustomThemeDefinition {
  return {
    id,
    name,
    baseTheme: 'plum',
    isDark: true,
    color: '#abcdef',
    variables: {},
    createdAt: 0,
    updatedAt: 0,
  };
}

function seedSettings(overrides?: Partial<ReturnType<typeof useSettingsStore.getState>>) {
  useSettingsStore.setState({
    theme: 'plum',
    uiFontScale: 1,
    setTheme: vi.fn(),
    setPreviewTheme: vi.fn(),
    setUIFontScale: vi.fn(),
    ...overrides,
  });
}

function seedCustomThemes(themes: ReturnType<typeof useCustomThemeStore.getState>['customThemes']) {
  useCustomThemeStore.setState({
    customThemes: themes,
    deleteTheme: vi.fn(),
    exportTheme: vi.fn().mockResolvedValue(undefined),
    importTheme: vi.fn().mockResolvedValue(undefined),
  });
}

describe('ThemesSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedSettings();
    seedCustomThemes([]);
  });

  afterEach(() => {
    seedSettings();
    seedCustomThemes([]);
    vi.restoreAllMocks();
  });

  it('renders the readability and palette cards', () => {
    render(<ThemesSection />);
    expect(screen.getByText('Readability')).toBeInTheDocument();
    expect(screen.getByText('Color theme')).toBeInTheDocument();
  });

  it('marks the active font-scale preset as pressed and others as not', () => {
    seedSettings({ uiFontScale: 1 });
    render(<ThemesSection />);
    const hundred = screen.getByRole('button', { name: '100%' });
    expect(hundred).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '110%' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a font-scale preset calls setUIFontScale with that scale', async () => {
    const setUIFontScale = vi.fn();
    seedSettings({ setUIFontScale });
    const { user } = render(<ThemesSection />);
    await user.click(screen.getByRole('button', { name: '110%' }));
    expect(setUIFontScale).toHaveBeenCalledWith(1.1);
  });

  it('renders built-in theme swatches with their theme name as accessible label', () => {
    render(<ThemesSection />);
    // Each ThemeSwatch carries aria-label = theme label.
    expect(screen.getByRole('button', { name: 'Plum' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sakura' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paper' })).toBeInTheDocument();
  });

  it('marks the active theme swatch as pressed', () => {
    seedSettings({ theme: 'sakura' });
    render(<ThemesSection />);
    expect(screen.getByRole('button', { name: 'Sakura' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Plum' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking a theme swatch calls setTheme with that theme value', async () => {
    const setTheme = vi.fn();
    seedSettings({ setTheme });
    const { user } = render(<ThemesSection />);
    await user.click(screen.getByRole('button', { name: 'Noir' }));
    expect(setTheme).toHaveBeenCalledWith('noir');
  });

  it('the System option is a pressable button that selects the system theme', async () => {
    const setTheme = vi.fn();
    seedSettings({ theme: 'plum', setTheme });
    const { user } = render(<ThemesSection />);
    const systemButton = screen.getByRole('button', { name: /System/ });
    expect(systemButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(systemButton);
    expect(setTheme).toHaveBeenCalledWith(SYSTEM_THEME);
  });

  it('the Import action calls importTheme', async () => {
    const importTheme = vi.fn().mockResolvedValue(undefined);
    seedCustomThemes([]);
    useCustomThemeStore.setState({ importTheme });
    const { user } = render(<ThemesSection />);
    await user.click(screen.getByRole('button', { name: 'Import' }));
    expect(importTheme).toHaveBeenCalledOnce();
  });

  it('with no custom themes, shows the New theme button and opens the editor', async () => {
    const { user } = render(<ThemesSection />);
    const newButton = screen.getByRole('button', { name: 'New theme' });
    await user.click(newButton);
    // The editor dialog opens (portalled) with its own heading.
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0));
  });

  it('renders custom theme swatches with edit/export/delete controls when present', () => {
    seedCustomThemes([makeCustomTheme('custom-1', 'My Theme')]);
    render(<ThemesSection />);
    // The custom swatch is labelled by its name.
    expect(screen.getByRole('button', { name: 'My Theme' })).toBeInTheDocument();
    // Its overlay controls carry aria-labels.
    expect(
      screen.getByRole('button', { name: i18n.t('settings:themes.custom.editAria') })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: i18n.t('settings:themes.custom.deleteAria') })
    ).toBeInTheDocument();
  });

  it('clicking a custom swatch export control calls exportTheme with its id', async () => {
    const exportTheme = vi.fn().mockResolvedValue(undefined);
    seedCustomThemes([makeCustomTheme('custom-1', 'My Theme')]);
    useCustomThemeStore.setState({ exportTheme });
    const { user } = render(<ThemesSection />);
    await user.click(
      screen.getByRole('button', { name: i18n.t('settings:themes.custom.exportAria') })
    );
    expect(exportTheme).toHaveBeenCalledWith('custom-1');
  });
});
