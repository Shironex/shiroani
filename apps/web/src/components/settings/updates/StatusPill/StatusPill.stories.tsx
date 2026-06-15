import type { Meta, StoryObj } from '@storybook/react-vite';
import StatusPill from './StatusPill';

const meta = {
  title: 'settings/updates/StatusPill',
  component: StatusPill,
} satisfies Meta<typeof StatusPill>;

export default meta;

type Story = StoryObj<typeof StatusPill>;

export const Default: Story = {
  args: { tone: 'green', text: 'Up to date' },
};
