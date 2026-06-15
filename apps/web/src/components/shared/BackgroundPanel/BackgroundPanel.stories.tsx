import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import BackgroundPanel from './BackgroundPanel';

const pickBackground = fn();
const removeBackground = fn();

/**
 * Shared background picker used by Settings · Appearance and first-run
 * onboarding. Owns the 16:9 preview (with a sakura-gradient fallback), the
 * pick/remove buttons and the opacity/blur/dim sliders, reading and writing the
 * `BackgroundStore`. The `card` variant is a flat layout for SettingsCard; the
 * `onboarding` variant frames the preview and shows sliders below (disabled
 * until an image is chosen). The decorator seeds the store so stories render a
 * deterministic empty/filled state without touching the backend.
 */
const meta: Meta<typeof BackgroundPanel> = {
  title: 'shared/BackgroundPanel',
  component: BackgroundPanel,
  parameters: {
    // The opacity/blur/dim sliders carry aria-labels which the shared Slider
    // primitive forwards to the role="slider" thumb, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['card', 'onboarding'],
      description:
        '`card` — flat Settings layout; `onboarding` — framed preview with sliders below.',
    },
    removeIcon: { description: 'Overrides the remove/reset button icon.' },
    removeLabel: { description: 'Overrides the remove/reset button label.' },
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
};

export default meta;

type Story = StoryObj<typeof BackgroundPanel>;

export const Card: Story = {
  args: { variant: 'card' },
};

export const Onboarding: Story = {
  args: { variant: 'onboarding' },
};

/**
 * With a custom image set, the card variant reveals the remove button and the
 * opacity/blur/dim sliders.
 */
export const CardWithBackground: Story = {
  args: { variant: 'card' },
  decorators: [
    Story => {
      useBackgroundStore.setState({
        customBackground:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="%23b07ab0"/></svg>',
        customBackgroundFileName: 'demo.svg',
      });
      return <Story />;
    },
  ],
};

/**
 * Clicking "Pick image" delegates to the store's `pickBackground` action.
 */
export const PicksImage: Story = {
  args: { variant: 'card' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /wybierz|pick image/i }));
    await expect(pickBackground).toHaveBeenCalled();
  },
};
