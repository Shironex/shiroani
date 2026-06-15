import type { Meta, StoryObj } from '@storybook/react-vite';
import BackgroundOverlay from './BackgroundOverlay';

const meta = {
  title: 'shared/BackgroundOverlay',
  component: BackgroundOverlay,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BackgroundOverlay>;

export default meta;

type Story = StoryObj<typeof BackgroundOverlay>;

export const Default: Story = {};
