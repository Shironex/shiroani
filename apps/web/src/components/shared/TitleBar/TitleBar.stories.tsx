import type { Meta, StoryObj } from '@storybook/react-vite';
import TitleBar from './TitleBar';

const meta = {
  title: 'shared/TitleBar',
  component: TitleBar,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TitleBar>;

export default meta;

type Story = StoryObj<typeof TitleBar>;

export const Default: Story = {};
