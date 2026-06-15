import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';
import SupportBanner from './SupportBanner';

/**
 * A dismissible top banner inviting users to support the project. It links out
 * to Buy Me a Coffee and GitHub Sponsors, and carries an icon-only dismiss
 * button. Visibility is driven by `useSupportBannerStore.seen`; once dismissed
 * (or either link opened) it marks itself seen and renders nothing.
 */
const meta = {
  title: 'shared/SupportBanner',
  component: SupportBanner,
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof SupportBanner>;

export default meta;

type Story = StoryObj<typeof SupportBanner>;

export const Default: Story = {
  decorators: [
    Story => {
      useSupportBannerStore.setState({ seen: false });
      return <Story />;
    },
  ],
};

export const DismissesOnClick: Story = {
  decorators: [
    Story => {
      useSupportBannerStore.setState({ seen: false, setSeen: fn() });
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /dismiss|zamknij/i }));
    await expect(useSupportBannerStore.getState().setSeen).toHaveBeenCalledTimes(1);
  },
};
