import type { Meta, StoryObj } from '@storybook/react-vite';
import ProgressRing from './ProgressRing';

const meta = {
  title: 'profile/ProgressRing',
  component: ProgressRing,
} satisfies Meta<typeof ProgressRing>;

export default meta;

type Story = StoryObj<typeof ProgressRing>;

export const Default: Story = {
  args: { value: 64, label: 'COMPLETED' },
};

export const CustomStroke: Story = {
  args: { value: 32, stroke: 'oklch(0.8 0.14 70)', label: 'PLANNING' },
};
