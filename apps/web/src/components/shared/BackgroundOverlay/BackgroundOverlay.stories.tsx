import type { Meta, StoryObj } from '@storybook/react-vite';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import BackgroundOverlay from './BackgroundOverlay';

/**
 * A fixed, full-viewport background layer rendered behind all app content. The
 * image, blur and scrim alpha come from CSS custom properties set by the settings
 * store (`--app-bg-image`, `--app-bg-blur`, `--app-bg-dim`); the image-layer opacity
 * is read directly from `useBackgroundStore`. It is purely decorative
 * (`pointer-events: none`, `aria-hidden`). With no wallpaper configured the image
 * layer is empty and only the readability scrim shows.
 */
const meta = {
  title: 'shared/BackgroundOverlay',
  component: BackgroundOverlay,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof BackgroundOverlay>;

export default meta;

type Story = StoryObj<typeof BackgroundOverlay>;

/** Default state — store opacity at its 0.15 default, no wallpaper image set. */
export const Default: Story = {
  decorators: [
    Story => {
      useBackgroundStore.setState({ backgroundOpacity: 0.15 });
      return <Story />;
    },
  ],
};

/** Image layer driven to full opacity via the background store. */
export const HighOpacity: Story = {
  decorators: [
    Story => {
      useBackgroundStore.setState({ backgroundOpacity: 1 });
      return <Story />;
    },
  ],
};
