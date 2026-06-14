import type { Meta, StoryObj } from '@storybook/react-vite';
import RandomFiltersPanel from './RandomFiltersPanel';

const meta = {
  title: 'discover/random/RandomFiltersPanel',
  component: RandomFiltersPanel,
} satisfies Meta<typeof RandomFiltersPanel>;

export default meta;

type Story = StoryObj<typeof RandomFiltersPanel>;

export const Default: Story = {
  args: {
    included: ['Action'],
    excluded: ['Horror'],
    disabled: false,
    onChange: () => {},
  },
};
