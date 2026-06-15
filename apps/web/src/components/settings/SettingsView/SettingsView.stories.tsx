import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import SettingsView from './SettingsView';

/**
 * The settings shell: a grouped tab sidebar (`role="tablist"`) plus the active
 * section panel (`role="tabpanel"`). Selecting a tab swaps the panel. Outside
 * Electron the default tab is Appearance → Themes; these stories navigate
 * between socket-free sections only, keeping the canvas deterministic.
 */
const meta = {
  title: 'settings/SettingsView',
  component: SettingsView,
  parameters: {
    layout: 'fullscreen',
    // Heading order is clean: the shared ViewHeader renders the panel's single
    // h1 and each SettingsCard renders a section h2 beneath it (no level skip).
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof SettingsView>;

export default meta;

type Story = StoryObj<typeof SettingsView>;

/** The default view — sidebar tablist + the active section panel. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('tablist', { name: 'Settings sections' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'About' })).toBeInTheDocument();
  },
};

/** Selecting a tab marks it selected and swaps the panel content. */
export const SwitchSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const aboutTab = canvas.getByRole('tab', { name: 'About' });
    await userEvent.click(aboutTab);
    await expect(aboutTab).toHaveAttribute('aria-selected', 'true');
    // The About panel renders its "Story" card.
    await expect(canvas.getByRole('heading', { name: 'Story' })).toBeInTheDocument();
  },
};
