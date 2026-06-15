import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import DeveloperSection from './DeveloperSection';

/**
 * Developer tools card. A single toggle (backed by `useSettingsStore`) gates a
 * row of dev actions: open DevTools, copy diagnostics, and show the log viewer.
 * Stories seed the store's `devModeEnabled` flag in `beforeEach`. The log-viewer
 * dialog subscribes to a log source on open, so it is left closed here.
 */
const meta = {
  title: 'settings/DeveloperSection',
  component: DeveloperSection,
  parameters: {
    // The toggle is labelled via the shared SettingsToggleRow wiring and every
    // dev button is named — axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DeveloperSection>;

export default meta;

type Story = StoryObj<typeof DeveloperSection>;

/** Developer mode off — only the gating toggle is shown. */
export const Off: Story = {
  beforeEach: () => {
    useSettingsStore.setState({ devModeEnabled: false });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('switch', { name: 'Enable developer mode' });
    await expect(toggle).not.toBeChecked();
    await expect(canvas.queryByRole('button', { name: 'DevTools' })).not.toBeInTheDocument();

    // Flipping the toggle drives the settings store and reveals the dev buttons.
    await userEvent.click(toggle);
    await expect(useSettingsStore.getState().devModeEnabled).toBe(true);
    await expect(canvas.getByRole('button', { name: 'Show logs' })).toBeInTheDocument();
  },
};

/** Developer mode on — DevTools / diagnostics / logs actions are visible. */
export const On: Story = {
  beforeEach: () => {
    useSettingsStore.setState({ devModeEnabled: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('switch', { name: 'Enable developer mode' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: 'DevTools' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Copy diagnostics' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Show logs' })).toBeInTheDocument();
  },
};
