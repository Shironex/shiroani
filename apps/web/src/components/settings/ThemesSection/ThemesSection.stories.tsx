import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCustomThemeStore } from '@/stores/useCustomThemeStore';
import ThemesSection from './ThemesSection';

const setTheme = fn();
const setPreviewTheme = fn();
const setUIFontScale = fn();
const importTheme = fn();

/**
 * Settings · Themes section. Two cards: a Readability card with UI font-scale
 * presets, and a Color theme card with the System option, the built-in
 * dark/light theme swatch grids, a custom-themes grid (when any exist), plus
 * import/new/edit/export/delete actions. Theme and font-scale state live in
 * `useSettingsStore`; custom themes live in `useCustomThemeStore`. The decorator
 * seeds both stores and stubs the write actions to `fn()` so hovering a swatch
 * or picking a scale never mutates the live DOM theme.
 */
const meta = {
  title: 'settings/ThemesSection',
  component: ThemesSection,
  parameters: {
    // Each theme swatch carries its theme name as an aria-label, the System
    // option and font-scale presets are named buttons, and the custom overlay
    // controls carry aria-labels, so axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [
    Story => {
      useSettingsStore.setState({
        theme: 'plum',
        uiFontScale: 1,
        setTheme,
        setPreviewTheme,
        setUIFontScale,
      });
      useCustomThemeStore.setState({
        customThemes: [],
        importTheme,
      });
      return <Story />;
    },
  ],
} satisfies Meta<typeof ThemesSection>;

export default meta;

type Story = StoryObj<typeof ThemesSection>;

export const Default: Story = {};

/** Picking a font-scale preset reports the scale through `setUIFontScale`. */
export const SelectsFontScale: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '110%' }));
    await expect(setUIFontScale).toHaveBeenCalledWith(1.1);
  },
};

/** Clicking a built-in theme swatch reports the theme value through `setTheme`. */
export const SelectsTheme: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Each swatch is labelled by its theme name.
    await userEvent.click(canvas.getByRole('button', { name: 'Noir' }));
    await expect(setTheme).toHaveBeenCalledWith('noir');
  },
};

/** The Import action delegates to the custom-theme store's `importTheme`. */
export const ImportsTheme: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Import' }));
    await expect(importTheme).toHaveBeenCalled();
  },
};
