import type { Meta, StoryObj } from '@storybook/react-vite';
import GradientPicker from './GradientPicker';

const meta = {
  title: 'diary/GradientPicker',
  component: GradientPicker,
} satisfies Meta<typeof GradientPicker>;

export default meta;

type Story = StoryObj<typeof GradientPicker>;

export const Default: Story = {
  args: {
    value: 'sakura',
    onChange: () => {},
  },
};

export const Stacked: Story = {
  args: {
    value: undefined,
    onChange: () => {},
    stacked: true,
  },
};
