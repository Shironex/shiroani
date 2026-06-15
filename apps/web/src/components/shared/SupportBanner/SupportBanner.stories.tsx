import type { Meta, StoryObj } from '@storybook/react-vite';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';
import SupportBanner from './SupportBanner';

const meta = {
  title: 'shared/SupportBanner',
  component: SupportBanner,
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
