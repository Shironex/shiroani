import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { withFullHeight } from '../../../../../.storybook/decorators';
import DiscordStep from './DiscordStep';

/**
 * Onboarding step 07 · Discord Rich Presence. Toggles the "now playing" presence
 * and previews the Discord card inline, reflecting the live toggle. RPC settings
 * live main-side (electron-store over IPC), so in the web preview the toggle is
 * disabled with a "desktop-only" notice and the local enabled state defaults on.
 */
const meta = {
  title: 'onboarding/steps/DiscordStep',
  component: DiscordStep,
  parameters: {
    layout: 'fullscreen',
    // The toggle is a labelled switch; the preview card is decorative text +
    // an empty-alt logo — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof DiscordStep>;

export default meta;

type Story = StoryObj<typeof DiscordStep>;

/** Default — enabled, previewing the example "watching" card. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Rich Presence' })).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: 'Enable integration' })).toBeChecked();
    await expect(canvas.getByText('Watching anime')).toBeInTheDocument();
  },
};
