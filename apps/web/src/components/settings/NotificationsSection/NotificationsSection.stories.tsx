import type { Meta, StoryObj } from '@storybook/react-vite';
import NotificationsSection from './NotificationsSection';

const meta = {
  title: 'settings/NotificationsSection',
  component: NotificationsSection,
} satisfies Meta<typeof NotificationsSection>;

export default meta;

type Story = StoryObj<typeof NotificationsSection>;

export const Default: Story = {};
