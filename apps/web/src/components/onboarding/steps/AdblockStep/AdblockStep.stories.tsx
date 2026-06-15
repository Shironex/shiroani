import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import AdblockStep from './AdblockStep';

/**
 * Onboarding step 06 · Ad blocking. Toggles the EasyList + EasyPrivacy adblock
 * for the built-in browser session (DockStore-adjacent BrowserStore) and lists
 * what gets blocked. The toggle is desktop-only, so in the web preview it shows
 * a "desktop-only" notice and stays disabled. Stories seed `useBrowserStore`.
 */
const meta = {
  title: 'onboarding/steps/AdblockStep',
  component: AdblockStep,
  parameters: {
    layout: 'fullscreen',
    // Toggle is a labelled switch; the blocked items render as a labelled list;
    // the shield glyph is aria-hidden — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useBrowserStore.setState({ adblockEnabled: true });
  },
} satisfies Meta<typeof AdblockStep>;

export default meta;

type Story = StoryObj<typeof AdblockStep>;

/** Default — adblock on, blocked-items list, desktop-only notice in web preview. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Ad blocking' })).toBeInTheDocument();
    await expect(canvas.getByRole('switch')).toBeChecked();
    await expect(canvas.getByRole('list', { name: 'Blocked items' })).toBeInTheDocument();
  },
};

/** Adblock disabled in the store. */
export const Disabled: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ adblockEnabled: false });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('switch')).not.toBeChecked();
  },
};
