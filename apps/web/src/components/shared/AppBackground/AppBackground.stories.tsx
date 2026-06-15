import type { Meta, StoryObj } from '@storybook/react-vite';
import AppBackground from './AppBackground';

const meta = {
  title: 'shared/AppBackground',
  component: AppBackground,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppBackground>;

export default meta;

type Story = StoryObj<typeof AppBackground>;

export const Default: Story = {};
