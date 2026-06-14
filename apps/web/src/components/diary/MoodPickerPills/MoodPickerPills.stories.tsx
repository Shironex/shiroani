import type { Meta, StoryObj } from '@storybook/react-vite';
import MoodPickerPills from './MoodPickerPills';

const meta = {
  title: 'diary/MoodPickerPills',
  component: MoodPickerPills,
} satisfies Meta<typeof MoodPickerPills>;

export default meta;

type Story = StoryObj<typeof MoodPickerPills>;

export const Default: Story = {
  args: {
    value: 'great',
    onChange: () => {},
    size: 'sm',
  },
};

export const Compact: Story = {
  args: {
    value: undefined,
    onChange: () => {},
    size: 'xs',
  },
};
