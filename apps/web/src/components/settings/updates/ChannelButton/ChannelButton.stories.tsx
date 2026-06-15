import type { Meta, StoryObj } from '@storybook/react-vite';
import ChannelButton from './ChannelButton';

const meta = {
  title: 'settings/updates/ChannelButton',
  component: ChannelButton,
} satisfies Meta<typeof ChannelButton>;

export default meta;

type Story = StoryObj<typeof ChannelButton>;

export const Default: Story = {
  args: { active: true, onClick: () => {}, children: 'Stable' },
};
