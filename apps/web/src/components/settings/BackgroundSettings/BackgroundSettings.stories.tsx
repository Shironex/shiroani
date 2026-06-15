import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import BackgroundSettings from './BackgroundSettings';

const pickBackground = fn();
const removeBackground = fn();

const DEMO_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="%23b07ab0"/></svg>';

/**
 * Settings · Appearance card that wraps the shared `BackgroundPanel` in a
 * titled SettingsCard. The panel owns the 16:9 preview, the pick/remove
 * buttons, and (once an image is set) the opacity/blur/dim sliders, reading and
 * writing the `BackgroundStore`. The decorator seeds the store so stories show
 * a deterministic empty or filled state without touching the backend.
 */
const meta = {
  title: 'settings/BackgroundSettings',
  component: BackgroundSettings,
  parameters: {
    // The pick/remove buttons are named and the panel sliders carry aria-labels
    // forwarded to their thumbs, so axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [
    Story => {
      useBackgroundStore.setState({
        customBackground: null,
        customBackgroundFileName: null,
        backgroundOpacity: 0.6,
        backgroundBlur: 4,
        backgroundDim: 0.5,
        pickBackground,
        removeBackground,
      });
      return <Story />;
    },
  ],
} satisfies Meta<typeof BackgroundSettings>;

export default meta;

type Story = StoryObj<typeof BackgroundSettings>;

/** Empty state — no custom image, so only the pick action shows. */
export const Default: Story = {};

/** With a custom image set, the remove action and the sliders are revealed. */
export const WithBackground: Story = {
  decorators: [
    Story => {
      useBackgroundStore.setState({
        customBackground: DEMO_IMAGE,
        customBackgroundFileName: 'demo.svg',
      });
      return <Story />;
    },
  ],
};

/** Clicking "Pick image" delegates to the store's `pickBackground` action. */
export const PicksImage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /pick image/i }));
    await expect(pickBackground).toHaveBeenCalled();
  },
};
