import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import ThemeStep from './ThemeStep';

/**
 * Onboarding step 03 · Theme picker. Dark + light theme groups via the shared
 * ThemeGrid; each swatch is a pressed-state button. Hover previews live, click
 * commits to the settings store. Stories seed `useSettingsStore` so the active
 * (pressed) swatch is deterministic.
 */
const meta = {
  title: 'onboarding/steps/ThemeStep',
  component: ThemeStep,
  parameters: {
    layout: 'fullscreen',
    // Every swatch is a button with aria-label + aria-pressed; group headers are
    // text — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useSettingsStore.setState({ theme: 'plum' });
  },
} satisfies Meta<typeof ThemeStep>;

export default meta;

type Story = StoryObj<typeof ThemeStep>;

/** Default — Plum active. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Plum', pressed: true })).toBeInTheDocument();
  },
};

/** Clicking a swatch commits the theme to the settings store. */
export const SelectsTheme: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Matcha' }));
    await waitFor(() => expect(useSettingsStore.getState().theme).toBe('matcha'));
  },
};
