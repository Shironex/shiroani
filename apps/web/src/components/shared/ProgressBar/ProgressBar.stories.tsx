import type { Meta, StoryObj } from '@storybook/react-vite';
import ProgressBar from './ProgressBar';

const meta = {
  title: 'shared/ProgressBar',
  component: ProgressBar,
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const Determinate: Story = {
  args: { value: 64, thickness: 8, glow: true },
};

export const Indeterminate: Story = {
  args: { indeterminate: true, thickness: 4 },
};
