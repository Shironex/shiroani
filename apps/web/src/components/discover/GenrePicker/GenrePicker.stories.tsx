import type { Meta, StoryObj } from '@storybook/react-vite';
import GenrePicker from './GenrePicker';

const meta = {
  title: 'discover/GenrePicker',
  component: GenrePicker,
} satisfies Meta<typeof GenrePicker>;

export default meta;

type Story = StoryObj<typeof GenrePicker>;

export const Default: Story = {
  args: {
    included: ['Action'],
    excluded: ['Horror'],
    onChange: () => {},
  },
};
