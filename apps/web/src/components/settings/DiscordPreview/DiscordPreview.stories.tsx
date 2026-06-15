import type { Meta, StoryObj } from '@storybook/react-vite';
import DiscordPreview from './DiscordPreview';

const meta = {
  title: 'settings/DiscordPreview',
  component: DiscordPreview,
} satisfies Meta<typeof DiscordPreview>;

export default meta;

type Story = StoryObj<typeof DiscordPreview>;

export const Default: Story = {
  args: {
    details: 'Watching One Piece',
    state: 'Episode 1000',
    showTimestamp: true,
    showLargeImage: true,
    showButton: true,
    activityType: 'watching',
  },
};
