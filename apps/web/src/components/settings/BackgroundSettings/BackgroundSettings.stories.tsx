import type { Meta, StoryObj } from '@storybook/react-vite';
import BackgroundSettings from './BackgroundSettings';

const meta = {
  title: 'settings/BackgroundSettings',
  component: BackgroundSettings,
} satisfies Meta<typeof BackgroundSettings>;

export default meta;

type Story = StoryObj<typeof BackgroundSettings>;

export const Default: Story = {};
